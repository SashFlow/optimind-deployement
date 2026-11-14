import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import {
	listEgressJobsByAgentSessionId,
	updateEgressJob,
} from "@repo/database";
import type { MergeTracksJobData } from "@repo/jobs";
import { recordingFilepath } from "@repo/livekit";
import { logger } from "@repo/logs";
import {
	downloadObjectToFile,
	getRecordingsS3Config,
	resolveObjectKey,
	uploadFileToObject,
} from "../recordings-s3";

const TRACK_ROLES = ["user_video", "user_audio", "agent_audio"] as const;
type TrackRole = (typeof TRACK_ROLES)[number];

const NS_PER_MS = BigInt(1_000_000);
const NS_PER_S = BigInt(1_000_000_000);

type TrackInput = {
	role: TrackRole;
	localPath: string;
	/** Seconds from session t0 (earliest egress startedAtNs). */
	delayS: number;
	startedAtNs?: bigint;
	endedAtNs?: bigint;
};

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function roleFromMetadata(metadata: unknown): TrackRole | null {
	const role = asRecord(metadata).role;
	if (typeof role !== "string") {
		return null;
	}
	return (TRACK_ROLES as readonly string[]).includes(role)
		? (role as TrackRole)
		: null;
}

function destinationFilepath(destination: unknown): string | null {
	const filepath = asRecord(destination).filepath;
	return typeof filepath === "string" && filepath.trim()
		? filepath.trim()
		: null;
}

/**
 * Prefer metadata.startedAtNs (LiveKit timeUnixNano as decimal string).
 * Fall back to Date.startedAt → ms * 1e6 when ns were never persisted.
 */
function readUnixNano(
	metadata: unknown,
	field: "startedAtNs" | "endedAtNs",
	fallbackDate?: Date | null,
): bigint | undefined {
	const raw = asRecord(metadata)[field];
	if (
		typeof raw === "string" ||
		typeof raw === "number" ||
		typeof raw === "bigint"
	) {
		try {
			const ns = typeof raw === "bigint" ? raw : BigInt(raw);
			if (ns > BigInt(0)) {
				return ns;
			}
		} catch {
			// ignore invalid metadata
		}
	}
	if (fallbackDate) {
		const ms = fallbackDate.getTime();
		if (Number.isFinite(ms) && ms > 0) {
			return BigInt(ms) * NS_PER_MS;
		}
	}
	return undefined;
}

function extensionFromKey(key: string, fallback: string): string {
	const ext = extname(key);
	if (ext && ext.length <= 8) {
		return ext;
	}
	return fallback;
}

async function runFfmpeg(args: string[]): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn("ffmpeg", ["-y", ...args], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stderr = "";
		child.stderr?.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf8");
		});
		child.on("error", (error) => {
			reject(
				error instanceof Error &&
					(error as NodeJS.ErrnoException).code === "ENOENT"
					? new Error("ffmpeg not found on PATH")
					: error,
			);
		});
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			const tail = stderr.trim().slice(-2000);
			reject(new Error(`ffmpeg exited with code ${code}: ${tail}`));
		});
	});
}

function delayMsForAdelay(delayS: number): string {
	// adelay accepts milliseconds; keep fractional ms from ns alignment.
	const ms = Math.max(0, delayS * 1000);
	return ms.toFixed(3);
}

async function mergeWithFfmpeg(
	tracks: TrackInput[],
	outputPath: string,
): Promise<void> {
	const byRole = new Map(tracks.map((t) => [t.role, t]));
	const video = byRole.get("user_video");
	const audios = [byRole.get("user_audio"), byRole.get("agent_audio")].filter(
		(t): t is TrackInput => Boolean(t),
	);

	if (!video && audios.length === 0) {
		throw new Error("No usable tracks to merge");
	}

	const inputArgs: string[] = [];
	const filterParts: string[] = [];
	let nextIndex = 0;

	let videoMap: string[] = [];
	if (video) {
		const idx = nextIndex++;
		inputArgs.push("-i", video.localPath);
		if (video.delayS > 0) {
			filterParts.push(
				`[${idx}:v]tpad=start_mode=add:start_duration=${video.delayS.toFixed(9)}[vout]`,
			);
			videoMap = ["-map", "[vout]"];
		} else {
			videoMap = ["-map", `${idx}:v:0`];
		}
	}

	const audioLabels: string[] = [];
	for (const audio of audios) {
		const idx = nextIndex++;
		inputArgs.push("-i", audio.localPath);
		const label = `a${audioLabels.length}`;
		if (audio.delayS > 0) {
			const delay = delayMsForAdelay(audio.delayS);
			filterParts.push(`[${idx}:a]adelay=${delay}|${delay}[${label}]`);
		} else {
			filterParts.push(`[${idx}:a]anull[${label}]`);
		}
		audioLabels.push(`[${label}]`);
	}

	let audioMap: string[] = [];
	if (audioLabels.length === 1) {
		filterParts.push(`${audioLabels[0]}aresample=async=1[aout]`);
		audioMap = ["-map", "[aout]"];
	} else if (audioLabels.length > 1) {
		filterParts.push(
			`${audioLabels.join("")}amix=inputs=${audioLabels.length}:duration=longest:normalize=0[amixed]`,
			`[amixed]aresample=async=1[aout]`,
		);
		audioMap = ["-map", "[aout]"];
	}

	const filterArgs =
		filterParts.length > 0
			? ["-filter_complex", filterParts.join(";")]
			: [];

	if (video) {
		await runFfmpeg([
			...inputArgs,
			...filterArgs,
			...videoMap,
			...audioMap,
			"-c:v",
			"libx264",
			"-preset",
			"veryfast",
			"-crf",
			"23",
			"-pix_fmt",
			"yuv420p",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-movflags",
			"+faststart",
			outputPath,
		]);
		return;
	}

	await runFfmpeg([
		...inputArgs,
		...filterArgs,
		...audioMap,
		"-c:a",
		"aac",
		"-b:a",
		"192k",
		"-movflags",
		"+faststart",
		outputPath,
	]);
}

export async function handleMergeTracks(
	data: MergeTracksJobData,
): Promise<void> {
	const { sessionId, organizationId, mergeJobId } = data;
	logger.info("Starting track merge", { sessionId, mergeJobId });

	await updateEgressJob(mergeJobId, { status: "ACTIVE" });

	const workDir = await mkdtemp(join(tmpdir(), "merge-tracks-"));

	try {
		const jobs = await listEgressJobsByAgentSessionId(sessionId);
		const trackJobs = jobs.filter(
			(job) => job.type === "TRACK" || job.type === "PARTICIPANT",
		);
		const completeTracks = trackJobs.filter(
			(job) => job.status === "COMPLETE",
		);

		const s3 = getRecordingsS3Config();
		const prepared: TrackInput[] = [];

		for (const job of completeTracks) {
			const role = roleFromMetadata(job.metadata);
			if (!role) {
				continue;
			}
			const key = resolveObjectKey(
				{
					fileUrl: job.fileUrl,
					outputUrls: job.outputUrls,
					filepath: destinationFilepath(job.destination),
				},
				s3.bucket,
			);
			if (!key) {
				logger.warn("Track job missing resolvable object key", {
					jobId: job.id,
					role,
				});
				continue;
			}

			const localPath = join(
				workDir,
				`${role}${extensionFromKey(key, role.includes("video") ? ".mp4" : ".ogg")}`,
			);
			const resolvedKey = await downloadObjectToFile(key, localPath);
			prepared.push({
				role,
				localPath,
				delayS: 0,
				startedAtNs: readUnixNano(
					job.metadata,
					"startedAtNs",
					job.startedAt,
				),
				endedAtNs: readUnixNano(job.metadata, "endedAtNs", job.endedAt),
			});
			logger.info("Downloaded track for merge", {
				role,
				key: resolvedKey,
				startedAtNs:
					prepared[prepared.length - 1]?.startedAtNs?.toString(),
			});
		}

		if (prepared.length === 0) {
			throw new Error("No COMPLETE track files available to merge");
		}

		const hasVideo = prepared.some((t) => t.role === "user_video");
		const hasAudio = prepared.some(
			(t) => t.role === "user_audio" || t.role === "agent_audio",
		);
		if (!hasVideo && !hasAudio) {
			throw new Error("Merged inputs missing video and audio");
		}

		const startedNs = prepared
			.map((t) => t.startedAtNs)
			.filter((t): t is bigint => typeof t === "bigint");
		const t0 =
			startedNs.length > 0
				? startedNs.reduce((a, b) => (a < b ? a : b))
				: null;

		for (const track of prepared) {
			if (t0 != null && track.startedAtNs != null) {
				const delayNs = track.startedAtNs - t0;
				track.delayS = Number(delayNs) / Number(NS_PER_S);
			} else {
				track.delayS = 0;
			}
		}

		logger.info("Track merge timeline", {
			sessionId,
			t0Ns: t0?.toString() ?? null,
			offsets: Object.fromEntries(
				prepared.map((t) => [t.role, Number(t.delayS.toFixed(6))]),
			),
		});

		const roomName =
			trackJobs.find((j) => j.roomName)?.roomName ??
			jobs.find((j) => j.roomName)?.roomName;
		if (!roomName) {
			throw new Error(
				"Cannot resolve roomName for merged recording path",
			);
		}

		const outputKey = recordingFilepath({
			organizationId,
			sessionId,
			roomName,
		});
		const outputPath = join(workDir, basename(outputKey) || "merged.mp4");

		await mergeWithFfmpeg(prepared, outputPath);

		const { sizeBytes } = await uploadFileToObject(
			outputKey,
			outputPath,
			"video/mp4",
		);

		const endedNs = prepared
			.map((t) => t.endedAtNs)
			.filter((t): t is bigint => typeof t === "bigint");
		const mergeStartedAt =
			t0 != null ? new Date(Number(t0 / NS_PER_MS)) : undefined;
		const mergeEndedNs =
			endedNs.length > 0
				? endedNs.reduce((a, b) => (a > b ? a : b))
				: null;
		const mergeEndedAt =
			mergeEndedNs != null
				? new Date(Number(mergeEndedNs / NS_PER_MS))
				: undefined;
		const durationMs =
			t0 != null && mergeEndedNs != null && mergeEndedNs >= t0
				? Number((mergeEndedNs - t0) / NS_PER_MS)
				: undefined;

		const mergeJob = jobs.find((j) => j.id === mergeJobId);
		const priorMeta = asRecord(mergeJob?.metadata);
		const fileUrl = `s3://${s3.bucket}/${outputKey}`;
		await updateEgressJob(mergeJobId, {
			status: "COMPLETE",
			fileUrl,
			outputUrls: [fileUrl],
			destination: {
				bucket: s3.bucket,
				region: s3.region,
				filepath: outputKey,
				endpoint: s3.endpoint ?? null,
			},
			startedAt: mergeStartedAt,
			endedAt: mergeEndedAt,
			durationMs,
			sizeBytes,
			errorMessage: null,
			metadata: {
				...priorMeta,
				source: "track_merge",
				alignedBy: "startedAtNs",
				t0Ns: t0?.toString() ?? null,
				trackOffsetsS: Object.fromEntries(
					prepared.map((t) => [t.role, Number(t.delayS.toFixed(9))]),
				),
			},
		});

		logger.info("Track merge complete", {
			sessionId,
			mergeJobId,
			outputKey,
			sizeBytes,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Track merge failed";
		logger.error("Track merge failed", {
			sessionId,
			mergeJobId,
			error,
		});
		await updateEgressJob(mergeJobId, {
			status: "FAILED",
			errorMessage: message.slice(0, 2000),
		}).catch((updateError) => {
			logger.error("Failed to mark merge job FAILED", {
				mergeJobId,
				updateError,
			});
		});
		throw error;
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {
			// best-effort cleanup
		});
	}
}

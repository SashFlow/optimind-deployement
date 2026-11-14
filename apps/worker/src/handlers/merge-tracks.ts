import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import {
	getAgentSessionById,
	getEgressJobById,
	listEgressJobsByAgentSessionId,
	updateEgressJob,
} from "@repo/database";
import type { MergeTracksJobData } from "@repo/jobs";
import { EgressStatus, listEgress, recordingFilepath } from "@repo/livekit";
import { logger } from "@repo/logs";
import {
	downloadObjectToFile,
	getRecordingsS3Config,
	resolveObjectKey,
	uploadFileToObject,
} from "../recordings-s3";

const TRACK_ROLES = ["user_audio", "user_video", "agent_audio"] as const;
type TrackRole = (typeof TRACK_ROLES)[number];

const NS_PER_MS = BigInt(1_000_000);
const NS_PER_S = BigInt(1_000_000_000);

type TrackInput = {
	role: TrackRole;
	localPath: string;
	/** Seconds from session t0 (earliest alignNs). */
	delayS: number;
	alignNs: bigint;
	startedAtNs?: bigint;
	fileStartedAtNs?: bigint;
	endedAtNs?: bigint;
	egressId?: string;
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

/** Match Python `role_from_filepath` — stem equals or starts with role name. */
function roleFromFilepath(
	filepath: string | null | undefined,
): TrackRole | null {
	if (!filepath) {
		return null;
	}
	const name = filepath.replace(/\/+$/, "").split("/").pop()?.toLowerCase();
	if (!name) {
		return null;
	}
	const stem = name.replace(/\.(ogg|mp3|wav|oga|webm|mp4|mkv)$/i, "");
	for (const role of TRACK_ROLES) {
		if (stem === role || stem.startsWith(role)) {
			return role;
		}
	}
	return null;
}

function destinationFilepath(destination: unknown): string | null {
	const filepath = asRecord(destination).filepath;
	return typeof filepath === "string" && filepath.trim()
		? filepath.trim()
		: null;
}

function readUnixNano(value: unknown): bigint | undefined {
	if (value == null) {
		return undefined;
	}
	try {
		const ns =
			typeof value === "bigint"
				? value
				: typeof value === "string" || typeof value === "number"
					? BigInt(value)
					: undefined;
		if (ns != null && ns > BigInt(0)) {
			return ns;
		}
	} catch {
		// ignore invalid values
	}
	return undefined;
}

/**
 * Prefer metadata ns (LiveKit timeUnixNano as decimal string).
 * Fall back to Date → ms * 1e6 when ns were never persisted.
 */
function readUnixNanoField(
	metadata: unknown,
	field: "startedAtNs" | "endedAtNs" | "fileStartedAtNs",
	fallbackDate?: Date | null,
): bigint | undefined {
	const fromMeta = readUnixNano(asRecord(metadata)[field]);
	if (fromMeta != null) {
		return fromMeta;
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

type LivekitTrackEgress = {
	role: TrackRole;
	egressId: string;
	startedAtNs: bigint;
	endedAtNs?: bigint;
	fileStartedAtNs?: bigint;
	filepath?: string;
	location?: string;
	alignNs: bigint;
};

function extractFileResult(info: {
	fileResults?: Array<{
		location?: string;
		startedAt?: bigint | number | string;
		endedAt?: bigint | number | string;
	}>;
	result?: {
		case?: string;
		// LiveKit oneof — only read when case === "file".
		value?: unknown;
	};
}): {
	location?: string;
	fileStartedAtNs?: bigint;
	fileEndedAtNs?: bigint;
} {
	const fr = info.fileResults?.[0];
	if (fr) {
		return {
			location: fr.location || undefined,
			fileStartedAtNs: readUnixNano(fr.startedAt),
			fileEndedAtNs: readUnixNano(fr.endedAt),
		};
	}
	if (info.result?.case === "file" && info.result.value) {
		const file = asRecord(info.result.value);
		return {
			location:
				typeof file.location === "string" ? file.location : undefined,
			fileStartedAtNs: readUnixNano(file.startedAt),
			fileEndedAtNs: readUnixNano(file.endedAt),
		};
	}
	return {};
}

function trackFilepathFromRequest(info: {
	request?: { case?: string; value?: unknown };
}): string | undefined {
	if (info.request?.case !== "track" || !info.request.value) {
		return undefined;
	}
	const value = asRecord(info.request.value);
	const file = asRecord(value.file);
	const filepath = file.filepath;
	return typeof filepath === "string" && filepath.trim()
		? filepath.trim()
		: undefined;
}

/**
 * LiveKit listEgress by room — same source as the Python merge script.
 * Prefer FileInfo.startedAt (media clock) over EgressInfo.startedAt.
 */
async function fetchTracksFromLivekit(
	roomName: string,
): Promise<LivekitTrackEgress[]> {
	const items = await listEgress({ roomName });
	const tracks: LivekitTrackEgress[] = [];

	for (const egress of items) {
		if (egress.request?.case !== "track") {
			continue;
		}
		if (
			egress.status !== EgressStatus.EGRESS_COMPLETE &&
			!(egress.fileResults?.length || egress.result?.case === "file")
		) {
			continue;
		}

		const filepath = trackFilepathFromRequest(egress);
		const role = roleFromFilepath(filepath);
		if (!role) {
			continue;
		}

		const startedAtNs = readUnixNano(egress.startedAt);
		if (startedAtNs == null) {
			continue;
		}

		const file = extractFileResult(egress);
		const fileStartedAtNs = file.fileStartedAtNs;
		const endedAtNs =
			readUnixNano(egress.endedAt) ?? file.fileEndedAtNs ?? undefined;

		tracks.push({
			role,
			egressId: egress.egressId,
			startedAtNs,
			endedAtNs,
			fileStartedAtNs,
			filepath,
			location: file.location,
			alignNs: fileStartedAtNs ?? startedAtNs,
		});
	}

	// Deduplicate by role — keep earliest align time (Python behaviour).
	const byRole = new Map<TrackRole, LivekitTrackEgress>();
	for (const track of tracks) {
		const prev = byRole.get(track.role);
		if (!prev || track.alignNs < prev.alignNs) {
			byRole.set(track.role, track);
		}
	}
	return TRACK_ROLES.map((role) => byRole.get(role)).filter(
		(t): t is LivekitTrackEgress => Boolean(t),
	);
}

async function resolveRoomName(opts: {
	sessionId: string;
	mergeJobId: string;
}): Promise<string> {
	const mergeJob = await getEgressJobById(opts.mergeJobId);
	if (mergeJob?.roomName?.trim()) {
		return mergeJob.roomName.trim();
	}

	const jobs = await listEgressJobsByAgentSessionId(opts.sessionId);
	const fromJobs = jobs.find((j) => j.roomName?.trim())?.roomName?.trim();
	if (fromJobs) {
		return fromJobs;
	}

	const session = await getAgentSessionById(opts.sessionId);
	const fromSession = session?.livekitRoomName?.trim();
	if (fromSession) {
		return fromSession;
	}

	throw new Error("Cannot resolve roomName for track merge");
}

export async function handleMergeTracks(
	data: MergeTracksJobData,
): Promise<void> {
	const { sessionId, organizationId, mergeJobId } = data;
	logger.info("Starting track merge", { sessionId, mergeJobId });

	await updateEgressJob(mergeJobId, { status: "ACTIVE" });

	const workDir = await mkdtemp(join(tmpdir(), "merge-tracks-"));

	try {
		const roomName = await resolveRoomName({ sessionId, mergeJobId });
		const s3 = getRecordingsS3Config();

		let livekitTracks: LivekitTrackEgress[] = [];
		try {
			livekitTracks = await fetchTracksFromLivekit(roomName);
			logger.info("Fetched LiveKit track egresses", {
				sessionId,
				roomName,
				roles: livekitTracks.map((t) => t.role),
				offsets: Object.fromEntries(
					(() => {
						if (livekitTracks.length === 0) {
							return [] as Array<[string, number]>;
						}
						const t0 = livekitTracks.reduce((a, b) =>
							a.alignNs < b.alignNs ? a : b,
						).alignNs;
						return livekitTracks.map((t) => [
							t.role,
							Number(t.alignNs - t0) / Number(NS_PER_S),
						]);
					})(),
				),
			});
		} catch (error) {
			logger.warn("LiveKit listEgress failed; falling back to DB jobs", {
				sessionId,
				roomName,
				error,
			});
		}

		const jobs = await listEgressJobsByAgentSessionId(sessionId);
		const dbByRole = new Map<
			TrackRole,
			{
				role: TrackRole;
				alignNs: bigint;
				startedAtNs?: bigint;
				fileStartedAtNs?: bigint;
				endedAtNs?: bigint;
				key: string | null;
				egressId?: string;
			}
		>();

		for (const job of jobs) {
			if (job.type !== "TRACK" && job.type !== "PARTICIPANT") {
				continue;
			}
			if (job.status !== "COMPLETE") {
				continue;
			}
			const role = roleFromMetadata(job.metadata);
			if (!role) {
				continue;
			}
			const startedAtNs = readUnixNanoField(
				job.metadata,
				"startedAtNs",
				job.startedAt,
			);
			const fileStartedAtNs = readUnixNanoField(
				job.metadata,
				"fileStartedAtNs",
			);
			const endedAtNs = readUnixNanoField(
				job.metadata,
				"endedAtNs",
				job.endedAt,
			);
			const alignNs = fileStartedAtNs ?? startedAtNs;
			if (alignNs == null) {
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
			const prev = dbByRole.get(role);
			if (!prev || alignNs < prev.alignNs) {
				dbByRole.set(role, {
					role,
					alignNs,
					startedAtNs: startedAtNs ?? undefined,
					fileStartedAtNs: fileStartedAtNs ?? undefined,
					endedAtNs: endedAtNs ?? undefined,
					key,
					egressId: job.livekitEgressId ?? undefined,
				});
			}
		}

		// LiveKit is source of truth for timestamps/locations; DB fills gaps.
		const byRole = new Map<
			TrackRole,
			{
				role: TrackRole;
				alignNs: bigint;
				startedAtNs?: bigint;
				fileStartedAtNs?: bigint;
				endedAtNs?: bigint;
				objectKey: string | null;
				egressId?: string;
				source: "livekit" | "db";
			}
		>();

		for (const track of livekitTracks) {
			const objectKey = resolveObjectKey(
				{
					fileUrl: track.location,
					filepath: track.filepath,
				},
				s3.bucket,
			);
			byRole.set(track.role, {
				role: track.role,
				alignNs: track.alignNs,
				startedAtNs: track.startedAtNs,
				fileStartedAtNs: track.fileStartedAtNs,
				endedAtNs: track.endedAtNs,
				objectKey,
				egressId: track.egressId,
				source: "livekit",
			});
		}

		for (const [role, dbTrack] of dbByRole) {
			const existing = byRole.get(role);
			if (!existing) {
				byRole.set(role, {
					role,
					alignNs: dbTrack.alignNs,
					startedAtNs: dbTrack.startedAtNs,
					fileStartedAtNs: dbTrack.fileStartedAtNs,
					endedAtNs: dbTrack.endedAtNs,
					objectKey: dbTrack.key,
					egressId: dbTrack.egressId,
					source: "db",
				});
				continue;
			}
			// Prefer LiveKit timestamps; keep DB object key if LiveKit lacked one.
			if (!existing.objectKey && dbTrack.key) {
				existing.objectKey = dbTrack.key;
			}
		}

		const prepared: TrackInput[] = [];
		for (const role of TRACK_ROLES) {
			const track = byRole.get(role);
			if (!track?.objectKey) {
				continue;
			}
			const localPath = join(
				workDir,
				`${role}${extensionFromKey(track.objectKey, role.includes("video") ? ".mp4" : ".ogg")}`,
			);
			const resolvedKey = await downloadObjectToFile(
				track.objectKey,
				localPath,
			);
			prepared.push({
				role,
				localPath,
				delayS: 0,
				alignNs: track.alignNs,
				startedAtNs: track.startedAtNs,
				fileStartedAtNs: track.fileStartedAtNs,
				endedAtNs: track.endedAtNs,
				egressId: track.egressId,
			});
			logger.info("Downloaded track for merge", {
				role,
				key: resolvedKey,
				source: track.source,
				alignNs: track.alignNs.toString(),
				fileStartedAtNs: track.fileStartedAtNs?.toString() ?? null,
				startedAtNs: track.startedAtNs?.toString() ?? null,
			});
		}

		if (prepared.length === 0) {
			throw new Error(
				`No COMPLETE track files available to merge for room ${roomName}`,
			);
		}

		const hasVideo = prepared.some((t) => t.role === "user_video");
		const hasAudio = prepared.some(
			(t) => t.role === "user_audio" || t.role === "agent_audio",
		);
		if (!hasVideo && !hasAudio) {
			throw new Error("Merged inputs missing video and audio");
		}

		const t0 = prepared.reduce((a, b) =>
			a.alignNs < b.alignNs ? a : b,
		).alignNs;

		for (const track of prepared) {
			const delayNs = track.alignNs - t0;
			track.delayS = Number(delayNs) / Number(NS_PER_S);
		}

		logger.info("Track merge timeline", {
			sessionId,
			roomName,
			t0Ns: t0.toString(),
			alignedBy: "fileStartedAtNs|startedAtNs",
			offsets: Object.fromEntries(
				prepared.map((t) => [t.role, Number(t.delayS.toFixed(6))]),
			),
		});

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
		const mergeStartedAt = new Date(Number(t0 / NS_PER_MS));
		const mergeEndedNs =
			endedNs.length > 0
				? endedNs.reduce((a, b) => (a > b ? a : b))
				: null;
		const mergeEndedAt =
			mergeEndedNs != null
				? new Date(Number(mergeEndedNs / NS_PER_MS))
				: undefined;
		const durationMs =
			mergeEndedNs != null && mergeEndedNs >= t0
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
				alignedBy: "fileStartedAtNs|startedAtNs",
				roomName,
				t0Ns: t0.toString(),
				trackOffsetsS: Object.fromEntries(
					prepared.map((t) => [t.role, Number(t.delayS.toFixed(9))]),
				),
				tracks: Object.fromEntries(
					prepared.map((t) => [
						t.role,
						{
							egressId: t.egressId ?? null,
							alignNs: t.alignNs.toString(),
							fileStartedAtNs:
								t.fileStartedAtNs?.toString() ?? null,
							startedAtNs: t.startedAtNs?.toString() ?? null,
						},
					]),
				),
			},
		});

		logger.info("Track merge complete", {
			sessionId,
			mergeJobId,
			roomName,
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

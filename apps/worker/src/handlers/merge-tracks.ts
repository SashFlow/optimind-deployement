import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import {
	getAgentSessionById,
	getEgressJobById,
	listEgressJobsByAgentSessionId,
	updateEgressJob,
} from "@repo/database";
import type { MergeTracksJobData } from "@repo/jobs";
import { EgressStatus, listEgress, recordingFilepath } from "@repo/livekit";
import { logger } from "@repo/logs";
import { runComposeMerge } from "../compose-merge";
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

type TrackSource = "livekit" | "db";

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
	source: TrackSource;
	/** True when LiveKit had the role but object key came from DB. */
	objectKeyFromDb?: boolean;
};

export type RunTrackMergeOptions = {
	sessionId: string;
	organizationId: string;
	/** When set with persistJob, updates this egress job row. */
	mergeJobId?: string;
	/** Work / output directory (created if missing). */
	workDir: string;
	/** Keep downloaded tracks + merged file in workDir (CLI). */
	keepLocalFiles?: boolean;
	/** Upload composite to recordings bucket (default true for jobs). */
	upload?: boolean;
	/** Persist COMPLETE/FAILED on mergeJobId (default true when mergeJobId set). */
	persistJob?: boolean;
	/** Optional absolute path for merged.mp4 (defaults under workDir). */
	outputPath?: string;
};

export type RunTrackMergeResult = {
	roomName: string;
	outputPath: string;
	outputKey: string;
	sizeBytes?: number;
	t0Ns: string;
	trackOffsetsS: Record<string, number>;
	uploaded: boolean;
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
	mergeJobId?: string;
}): Promise<string> {
	if (opts.mergeJobId) {
		const mergeJob = await getEgressJobById(opts.mergeJobId);
		if (mergeJob?.roomName?.trim()) {
			return mergeJob.roomName.trim();
		}
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

/**
 * Shared merge pipeline for BullMQ jobs and the local CLI.
 */
export async function runTrackMerge(
	opts: RunTrackMergeOptions,
): Promise<RunTrackMergeResult> {
	const {
		sessionId,
		organizationId,
		mergeJobId,
		workDir,
		keepLocalFiles = false,
		upload = true,
		persistJob = Boolean(mergeJobId),
		outputPath: outputPathOpt,
	} = opts;

	await mkdir(workDir, { recursive: true });
	const scratchDir = keepLocalFiles
		? workDir
		: await mkdtemp(join(tmpdir(), "merge-tracks-"));

	try {
		const roomName = await resolveRoomName({ sessionId, mergeJobId });
		const s3 = getRecordingsS3Config();

		let livekitTracks: LivekitTrackEgress[] = [];
		let livekitListFailed = false;
		try {
			livekitTracks = await fetchTracksFromLivekit(roomName);
			logger.info("Fetched LiveKit track egresses", {
				sessionId,
				roomName,
				roles: livekitTracks.map((t) => t.role),
			});
		} catch (error) {
			livekitListFailed = true;
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
				source: TrackSource;
				objectKeyFromDb: boolean;
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
				objectKeyFromDb: false,
			});
		}

		for (const [role, dbTrack] of dbByRole) {
			const existing = byRole.get(role);
			if (!existing) {
				logger.warn("Track role resolved from DB fallback", {
					sessionId,
					roomName,
					role,
					source: "db",
					alignNs: dbTrack.alignNs.toString(),
					egressId: dbTrack.egressId ?? null,
					objectKey: dbTrack.key,
					livekitListFailed,
				});
				byRole.set(role, {
					role,
					alignNs: dbTrack.alignNs,
					startedAtNs: dbTrack.startedAtNs,
					fileStartedAtNs: dbTrack.fileStartedAtNs,
					endedAtNs: dbTrack.endedAtNs,
					objectKey: dbTrack.key,
					egressId: dbTrack.egressId,
					source: "db",
					objectKeyFromDb: true,
				});
				continue;
			}
			if (!existing.objectKey && dbTrack.key) {
				logger.warn("Track object key filled from DB fallback", {
					sessionId,
					roomName,
					role,
					source: "livekit",
					objectKeyFromDb: true,
					alignNs: existing.alignNs.toString(),
					egressId: existing.egressId ?? null,
					objectKey: dbTrack.key,
				});
				existing.objectKey = dbTrack.key;
				existing.objectKeyFromDb = true;
			}
		}

		logger.info("Track resolution sources", {
			sessionId,
			roomName,
			livekitListFailed,
			roles: Object.fromEntries(
				TRACK_ROLES.map((role) => {
					const t = byRole.get(role);
					if (!t) {
						return [role, null];
					}
					return [
						role,
						{
							source: t.source,
							objectKeyFromDb: t.objectKeyFromDb,
							alignNs: t.alignNs.toString(),
							egressId: t.egressId ?? null,
							hasObjectKey: Boolean(t.objectKey),
						},
					];
				}),
			),
		});

		const downloadDir = keepLocalFiles
			? join(workDir, "tracks")
			: scratchDir;
		await mkdir(downloadDir, { recursive: true });

		const prepared: TrackInput[] = [];
		for (const role of TRACK_ROLES) {
			const track = byRole.get(role);
			if (!track?.objectKey) {
				continue;
			}
			const localPath = join(
				downloadDir,
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
				source: track.source,
				objectKeyFromDb: track.objectKeyFromDb,
			});
			logger.info("Downloaded track for merge", {
				role,
				key: resolvedKey,
				source: track.source,
				objectKeyFromDb: track.objectKeyFromDb,
				alignNs: track.alignNs.toString(),
			});
		}

		if (prepared.length === 0) {
			throw new Error(
				`No COMPLETE track files available to merge for room ${roomName}`,
			);
		}

		const userAudio = prepared.find((t) => t.role === "user_audio");
		const agentAudio = prepared.find((t) => t.role === "agent_audio");
		const userVideo = prepared.find((t) => t.role === "user_video");

		if (!userAudio || !agentAudio) {
			throw new Error(
				"Merged inputs require user_audio and agent_audio tracks",
			);
		}

		const t0 = prepared.reduce((a, b) =>
			a.alignNs < b.alignNs ? a : b,
		).alignNs;

		for (const track of prepared) {
			const delayNs = track.alignNs - t0;
			track.delayS = Number(delayNs) / Number(NS_PER_S);
		}

		logger.info("Track merge timeline (egress)", {
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
		const outBase = basename(outputKey).replace(/\.mp4$/i, "") || "merged";
		const wavInScratch = join(scratchDir, `${outBase}.wav`);
		const mergedInScratch = join(
			scratchDir,
			basename(outputKey) || "merged.mp4",
		);

		const composeResult = await runComposeMerge({
			agentPath: agentAudio.localPath,
			userPath: userAudio.localPath,
			agentEgressNs: agentAudio.alignNs,
			userEgressNs: userAudio.alignNs,
			outWav: wavInScratch,
			padS: 0.5,
			...(userVideo
				? {
						videoPath: userVideo.localPath,
						videoEgressNs: userVideo.alignNs,
						videoOut: mergedInScratch,
					}
				: {}),
		});

		const finalOutput =
			outputPathOpt ??
			(keepLocalFiles
				? join(workDir, userVideo ? "merged.mp4" : "merged_audio.wav")
				: userVideo
					? mergedInScratch
					: wavInScratch);

		const composeArtifact = userVideo ? mergedInScratch : wavInScratch;
		if (finalOutput !== composeArtifact) {
			await mkdir(dirname(finalOutput), { recursive: true });
			await copyFile(composeArtifact, finalOutput);
		}

		if (
			keepLocalFiles &&
			composeResult.outWav !== join(workDir, "merged_audio.wav")
		) {
			const wavDest = join(workDir, "merged_audio.wav");
			if (composeResult.outWav !== wavDest) {
				await copyFile(composeResult.outWav, wavDest).catch(
					() => undefined,
				);
			}
		}

		const trackOffsetsS = Object.fromEntries(
			prepared.map((t) => [t.role, Number(t.delayS.toFixed(9))]),
		);
		const trackSources = Object.fromEntries(
			prepared.map((t) => [
				t.role,
				{
					source: t.source,
					objectKeyFromDb: Boolean(t.objectKeyFromDb),
				},
			]),
		);

		if (keepLocalFiles) {
			await writeFile(
				join(workDir, "merge_diagnostics.json"),
				JSON.stringify(
					{
						sessionId,
						roomName,
						t0Ns: t0.toString(),
						trackOffsetsS,
						trackSources,
						compose: composeResult,
						tracks: prepared.map((t) => ({
							role: t.role,
							localPath: t.localPath,
							delayS: t.delayS,
							alignNs: t.alignNs.toString(),
							egressId: t.egressId ?? null,
							source: t.source,
							objectKeyFromDb: Boolean(t.objectKeyFromDb),
						})),
					},
					null,
					2,
				),
				"utf8",
			);
		}

		let sizeBytes: number | undefined;
		let uploaded = false;
		if (upload) {
			const contentType = userVideo ? "video/mp4" : "audio/wav";
			const uploadKey = userVideo
				? outputKey
				: outputKey.replace(/\.mp4$/i, ".wav");
			const uploadedInfo = await uploadFileToObject(
				uploadKey,
				finalOutput,
				contentType,
			);
			sizeBytes = uploadedInfo.sizeBytes;
			uploaded = true;
		} else {
			const { stat } = await import("node:fs/promises");
			sizeBytes = (await stat(finalOutput)).size;
		}

		const resolvedOutputKey = userVideo
			? outputKey
			: outputKey.replace(/\.mp4$/i, ".wav");

		if (persistJob && mergeJobId) {
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
			const fileUrl = `s3://${s3.bucket}/${resolvedOutputKey}`;
			await updateEgressJob(mergeJobId, {
				status: "COMPLETE",
				fileUrl,
				outputUrls: [fileUrl],
				destination: {
					bucket: s3.bucket,
					region: s3.region,
					filepath: resolvedOutputKey,
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
					composeEngine: "python_egress_canvas",
					roomName,
					t0Ns: t0.toString(),
					trackOffsetsS,
					trackSources,
					spanS: composeResult.spanS,
					tracks: Object.fromEntries(
						prepared.map((t) => [
							t.role,
							{
								egressId: t.egressId ?? null,
								alignNs: t.alignNs.toString(),
								fileStartedAtNs:
									t.fileStartedAtNs?.toString() ?? null,
								startedAtNs: t.startedAtNs?.toString() ?? null,
								delayS: Number(t.delayS.toFixed(9)),
								source: t.source,
								objectKeyFromDb: Boolean(t.objectKeyFromDb),
							},
						]),
					),
				},
			});
		}

		return {
			roomName,
			outputPath: finalOutput,
			outputKey: resolvedOutputKey,
			sizeBytes,
			t0Ns: t0.toString(),
			trackOffsetsS,
			uploaded,
		};
	} finally {
		if (!keepLocalFiles && scratchDir !== workDir) {
			await rm(scratchDir, { recursive: true, force: true }).catch(
				() => undefined,
			);
		}
	}
}

export async function handleMergeTracks(
	data: MergeTracksJobData,
): Promise<void> {
	const { sessionId, organizationId, mergeJobId } = data;
	logger.info("Starting track merge", { sessionId, mergeJobId });

	await updateEgressJob(mergeJobId, { status: "ACTIVE" });

	const workDir = await mkdtemp(join(tmpdir(), "merge-job-"));

	try {
		const result = await runTrackMerge({
			sessionId,
			organizationId,
			mergeJobId,
			workDir,
			upload: true,
			persistJob: true,
			keepLocalFiles: false,
		});
		logger.info("Track merge complete", {
			sessionId,
			mergeJobId,
			roomName: result.roomName,
			outputKey: result.outputKey,
			sizeBytes: result.sizeBytes,
			trackOffsetsS: result.trackOffsetsS,
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

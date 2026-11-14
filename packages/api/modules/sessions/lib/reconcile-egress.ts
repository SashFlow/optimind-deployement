import { EgressStatus } from "@livekit/protocol";
import { updateEgressJob } from "@repo/database";
import { listEgress, stopEgress } from "@repo/livekit";
import { logger } from "@repo/logs";
import { maybeEnqueueSessionTrackMerge } from "./enqueue-track-merge";
import {
	objectKeyFromEgressLocation,
	resolveEgressObjectRef,
	resolveObjectRef,
} from "./egress-media-url";

const SOURCE_EGRESS_TYPES = new Set(["TRACK", "PARTICIPANT"]);

export type EgressJobStatus =
	| "STARTING"
	| "ACTIVE"
	| "ENDING"
	| "COMPLETE"
	| "FAILED"
	| "ABORTED";

const OPEN_STATUSES = new Set<string>(["STARTING", "ACTIVE", "ENDING"]);

export function mapLivekitEgressStatus(
	status: EgressStatus | number | undefined,
): EgressJobStatus {
	switch (status) {
		case EgressStatus.EGRESS_STARTING:
			return "STARTING";
		case EgressStatus.EGRESS_ACTIVE:
			return "ACTIVE";
		case EgressStatus.EGRESS_ENDING:
			return "ENDING";
		case EgressStatus.EGRESS_COMPLETE:
			return "COMPLETE";
		case EgressStatus.EGRESS_FAILED:
		case EgressStatus.EGRESS_LIMIT_REACHED:
			return "FAILED";
		case EgressStatus.EGRESS_ABORTED:
			return "ABORTED";
		default:
			return "ACTIVE";
	}
}

function extractFileUrl(egressInfo: {
	file?: { location?: string };
	fileResults?: Array<{ location?: string }>;
}): string | undefined {
	if (egressInfo.file?.location) {
		return egressInfo.file.location;
	}
	const first = egressInfo.fileResults?.find((f) => f.location);
	return first?.location;
}

// Postgres INT4 max; `durationMs` is an Int column.
const MAX_INT4 = 2_147_483_647;

/**
 * LiveKit EgressInfo startedAt/endedAt are unix nanoseconds (timeUnixNano).
 * Values exceed Number.MAX_SAFE_INTEGER, so keep them as bigint.
 */
export function egressUnixNano(
	value?: bigint | number | string | null,
): bigint | undefined {
	if (value == null) {
		return undefined;
	}
	try {
		const ns = typeof value === "bigint" ? value : BigInt(value);
		if (ns <= BigInt(0)) {
			return undefined;
		}
		return ns;
	} catch {
		return undefined;
	}
}

const NS_PER_MS = BigInt(1_000_000);

/**
 * LiveKit reports startedAt/endedAt as nanosecond bigints. Converts to a Date,
 * or undefined when missing / non-positive / non-finite.
 */
export function egressTimestampToDate(
	value?: bigint | number | string | null,
): Date | undefined {
	const ns = egressUnixNano(value);
	if (ns == null) {
		return undefined;
	}
	const ms = Number(ns / NS_PER_MS);
	if (!Number.isFinite(ms) || ms <= 0) {
		return undefined;
	}
	return new Date(ms);
}

/**
 * LiveKit reports startedAt/endedAt as nanosecond bigints. Returns a whole
 * number of ms, or undefined when the timestamps are missing or nonsensical
 * (e.g. endedAt before startedAt), so we never write an out-of-range value.
 */
export function egressDurationMs(info: {
	startedAt?: bigint | number | string | null;
	endedAt?: bigint | number | string | null;
}): number | undefined {
	const startedAt = egressUnixNano(info.startedAt);
	const endedAt = egressUnixNano(info.endedAt);
	if (startedAt == null || endedAt == null || endedAt < startedAt) {
		return undefined;
	}
	const ms = Number((endedAt - startedAt) / NS_PER_MS);
	if (!Number.isFinite(ms) || ms < 0 || ms > MAX_INT4) {
		return undefined;
	}
	return ms;
}

/** Fields we sync from LiveKit EgressInfo onto our EgressJob row. */
export function egressTimingFields(info: {
	startedAt?: bigint | number | string | null;
	endedAt?: bigint | number | string | null;
}): {
	startedAt?: Date;
	endedAt?: Date;
	durationMs?: number;
} {
	const startedAt = egressTimestampToDate(info.startedAt);
	const endedAt = egressTimestampToDate(info.endedAt);
	const durationMs = egressDurationMs(info);
	return {
		...(startedAt ? { startedAt } : {}),
		...(endedAt ? { endedAt } : {}),
		...(durationMs != null ? { durationMs } : {}),
	};
}

type EgressTimingSource = {
	startedAt?: bigint | number | string | null;
	endedAt?: bigint | number | string | null;
	fileResults?: Array<{ startedAt?: bigint | number | string | null }>;
	file?: { startedAt?: bigint | number | string | null };
	/** LiveKit oneof — only read when case === "file". */
	result?: { case?: string; value?: unknown };
};

/**
 * FileInfo.startedAt is the media clock (when recording actually began).
 * Prefer over EgressInfo.startedAt when aligning track egresses.
 */
export function egressFileStartedAtNs(
	info: EgressTimingSource,
): bigint | undefined {
	const fromResults = info.fileResults?.[0]?.startedAt;
	if (fromResults != null) {
		return egressUnixNano(fromResults);
	}
	if (info.file?.startedAt != null) {
		return egressUnixNano(info.file.startedAt);
	}
	if (info.result?.case === "file" && info.result.value) {
		const value = info.result.value as {
			startedAt?: bigint | number | string | null;
		};
		return egressUnixNano(value.startedAt);
	}
	return undefined;
}

/**
 * Persist raw LiveKit timeUnixNano on metadata so the merge worker can align
 * tracks without losing sub-ms precision (Date columns are ms only).
 * Prefer fileStartedAtNs (FileInfo media clock) when present.
 */
export function egressTimingMetadata(
	existingMetadata: unknown,
	info: EgressTimingSource,
): {
	[key: string]: string | number | boolean | null;
} {
	const prev =
		existingMetadata &&
		typeof existingMetadata === "object" &&
		!Array.isArray(existingMetadata)
			? { ...(existingMetadata as Record<string, unknown>) }
			: {};
	const startedAtNs = egressUnixNano(info.startedAt);
	const endedAtNs = egressUnixNano(info.endedAt);
	const fileStartedAtNs = egressFileStartedAtNs(info);
	// Cast through unknown — metadata may contain nested JSON (arrays/objects).
	return {
		...prev,
		...(startedAtNs != null ? { startedAtNs: startedAtNs.toString() } : {}),
		...(endedAtNs != null ? { endedAtNs: endedAtNs.toString() } : {}),
		...(fileStartedAtNs != null
			? { fileStartedAtNs: fileStartedAtNs.toString() }
			: {}),
	} as unknown as {
		[key: string]: string | number | boolean | null;
	};
}

type EgressJobLike = {
	id: string;
	status: string;
	type?: string;
	agentSessionId?: string | null;
	livekitEgressId?: string | null;
	roomName?: string | null;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	metadata?: unknown;
	destination?: unknown;
};

function filepathFromLocation(
	location: string,
	destination?: unknown,
): string | undefined {
	const destBucket =
		destination &&
		typeof destination === "object" &&
		!Array.isArray(destination) &&
		typeof (destination as { bucket?: unknown }).bucket === "string"
			? (destination as { bucket: string }).bucket
			: undefined;
	return objectKeyFromEgressLocation(location, destBucket);
}

function withUpdatedDestinationFilepath(
	destination: unknown,
	filepath: string,
) {
	const prev =
		destination &&
		typeof destination === "object" &&
		!Array.isArray(destination)
			? (destination as Record<string, unknown>)
			: {};
	// Prisma InputJsonValue — cast through unknown for Record spreads.
	return { ...prev, filepath } as unknown as {
		[key: string]: string | number | boolean | null;
	};
}

function isSyntheticEgressJob(job: EgressJobLike): boolean {
	if (typeof job.livekitEgressId === "string") {
		if (
			job.livekitEgressId.startsWith("track-merge:") ||
			job.livekitEgressId.startsWith("storage:")
		) {
			return true;
		}
	}
	if (job.metadata && typeof job.metadata === "object") {
		const source = (job.metadata as Record<string, unknown>).source;
		return source === "track_merge" || source === "storage_backfill";
	}
	return false;
}

async function maybeEnqueueMergesForJobs(jobs: EgressJobLike[]) {
	const sessionIds = new Set<string>();
	for (const job of jobs) {
		if (
			job.type &&
			SOURCE_EGRESS_TYPES.has(job.type) &&
			job.agentSessionId
		) {
			sessionIds.add(job.agentSessionId);
		}
	}
	await Promise.all(
		[...sessionIds].map((sessionId) =>
			maybeEnqueueSessionTrackMerge(sessionId),
		),
	);
}

export async function reconcileEgressJob(job: EgressJobLike) {
	if (!OPEN_STATUSES.has(job.status)) {
		return null;
	}
	// Worker-owned merge / storage-backfill jobs use synthetic IDs — not in LiveKit.
	if (isSyntheticEgressJob(job)) {
		return null;
	}
	if (!job.livekitEgressId && !job.roomName) {
		return null;
	}

	try {
		const infos = await listEgress({
			egressId: job.livekitEgressId ?? undefined,
			roomName: job.livekitEgressId
				? undefined
				: (job.roomName ?? undefined),
		});
		const info = job.livekitEgressId
			? infos.find((row) => row.egressId === job.livekitEgressId)
			: infos[0];
		if (!info) {
			return null;
		}

		const fileUrl =
			extractFileUrl(info as never) ?? job.fileUrl ?? undefined;
		const outputUrls = fileUrl
			? Array.from(new Set([...(job.outputUrls ?? []), fileUrl]))
			: (job.outputUrls ?? undefined);

		const filepath = fileUrl
			? filepathFromLocation(fileUrl, job.destination)
			: undefined;
		const destination = filepath
			? withUpdatedDestinationFilepath(job.destination, filepath)
			: undefined;

		return await updateEgressJob(job.id, {
			status: mapLivekitEgressStatus(info.status),
			fileUrl: fileUrl ?? undefined,
			outputUrls,
			...(destination ? { destination } : {}),
			errorMessage: info.error || undefined,
			...egressTimingFields(info),
			metadata: egressTimingMetadata(job.metadata, info),
		});
	} catch (error) {
		logger.warn("Failed to reconcile egress job", {
			egressJobId: job.id,
			livekitEgressId: job.livekitEgressId,
			error,
		});
		return null;
	}
}

function hasFileExtension(path: string): boolean {
	const base = path.split("/").pop() ?? path;
	return base.includes(".");
}

/**
 * Persist LiveKit's real object key (`user_video.mp4`) over the extensionless
 * DirectFileOutput template (`user_video`) once the object exists in storage.
 */
async function healExtensionlessDestination(job: EgressJobLike) {
	if (job.status !== "COMPLETE") {
		return null;
	}
	const current = resolveObjectRef(job);
	if (!current || hasFileExtension(current.key)) {
		return null;
	}

	const resolved = await resolveEgressObjectRef(job);
	if (!resolved || resolved.key === current.key) {
		return null;
	}

	const fileUrl = `s3://${resolved.bucket}/${resolved.key}`;
	const outputUrls = Array.from(
		new Set([...(job.outputUrls ?? []), fileUrl].filter(Boolean)),
	);

	try {
		return await updateEgressJob(job.id, {
			fileUrl,
			outputUrls,
			destination: withUpdatedDestinationFilepath(
				job.destination,
				resolved.key,
			),
		});
	} catch (error) {
		logger.warn("Failed to heal extensionless egress destination", {
			egressJobId: job.id,
			fromKey: current.key,
			toKey: resolved.key,
			error,
		});
		return null;
	}
}

export async function reconcileOpenEgressJobs(jobs: EgressJobLike[]) {
	const open = jobs.filter((job) => OPEN_STATUSES.has(job.status));
	if (open.length > 0) {
		await Promise.all(open.map((job) => reconcileEgressJob(job)));
	}

	const complete = jobs.filter((job) => job.status === "COMPLETE");
	if (complete.length > 0) {
		await Promise.all(
			complete.map((job) => healExtensionlessDestination(job)),
		);
	}

	await maybeEnqueueMergesForJobs(jobs);
	return jobs;
}

/** LiveKit rejects stop when egress is already terminal (common race on session end). */
function isAlreadyTerminalEgressError(error: unknown): boolean {
	const text =
		error instanceof Error
			? error.message
			: typeof error === "object" && error !== null
				? JSON.stringify(error)
				: String(error);
	return /cannot be stopped|EGRESS_(COMPLETE|FAILED|ABORTED|LIMIT_REACHED)/i.test(
		text,
	);
}

/** Best-effort stop + refresh for open egress jobs before room delete. */
export async function finalizeSessionEgressJobs(jobs: EgressJobLike[]) {
	const open = jobs.filter((job) => OPEN_STATUSES.has(job.status));
	for (const job of open) {
		if (!job.livekitEgressId || isSyntheticEgressJob(job)) {
			continue;
		}

		// Sync from LiveKit first — if egress already finished, skip stop.
		const reconciled = await reconcileEgressJob(job);
		if (reconciled && !OPEN_STATUSES.has(reconciled.status)) {
			continue;
		}

		try {
			await stopEgress(job.livekitEgressId);
		} catch (error) {
			if (!isAlreadyTerminalEgressError(error)) {
				logger.warn("Failed to stop egress before session end", {
					egressJobId: job.id,
					livekitEgressId: job.livekitEgressId,
					error,
				});
			}
		}
	}
	await Promise.all(open.map((job) => reconcileEgressJob(job)));
	await maybeEnqueueMergesForJobs(jobs);
}

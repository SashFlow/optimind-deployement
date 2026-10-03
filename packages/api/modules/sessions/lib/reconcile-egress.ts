import { EgressStatus } from "@livekit/protocol";
import { updateEgressJob } from "@repo/database";
import { listEgress, stopEgress } from "@repo/livekit";
import { logger } from "@repo/logs";
import { maybeEnqueueSessionTrackMerge } from "./enqueue-track-merge";

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
 * LiveKit reports startedAt/endedAt as nanosecond bigints. Converts to a Date,
 * or undefined when missing / non-positive / non-finite.
 */
export function egressTimestampToDate(
	value?: bigint | number,
): Date | undefined {
	if (value == null) {
		return undefined;
	}
	const ns = Number(value);
	if (!Number.isFinite(ns) || ns <= 0) {
		return undefined;
	}
	const ms = Math.round(ns / 1_000_000);
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
	startedAt?: bigint | number;
	endedAt?: bigint | number;
}): number | undefined {
	if (!info.startedAt || !info.endedAt) {
		return undefined;
	}
	const ms = Math.round(
		(Number(info.endedAt) - Number(info.startedAt)) / 1_000_000,
	);
	if (!Number.isFinite(ms) || ms < 0 || ms > MAX_INT4) {
		return undefined;
	}
	return ms;
}

/** Fields we sync from LiveKit EgressInfo onto our EgressJob row. */
export function egressTimingFields(info: {
	startedAt?: bigint | number;
	endedAt?: bigint | number;
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

function filepathFromLocation(location: string): string | undefined {
	if (location.startsWith("s3://")) {
		const without = location.slice("s3://".length);
		const slash = without.indexOf("/");
		return slash === -1 ? undefined : without.slice(slash + 1);
	}
	try {
		return new URL(location).pathname.replace(/^\//, "") || undefined;
	} catch {
		return undefined;
	}
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

function isTrackMergeEgressJob(job: EgressJobLike): boolean {
	if (
		typeof job.livekitEgressId === "string" &&
		job.livekitEgressId.startsWith("track-merge:")
	) {
		return true;
	}
	if (job.metadata && typeof job.metadata === "object") {
		return (
			(job.metadata as Record<string, unknown>).source === "track_merge"
		);
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
	// Worker-owned merge jobs use a synthetic livekitEgressId — not in LiveKit.
	if (isTrackMergeEgressJob(job)) {
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

		const filepath = fileUrl ? filepathFromLocation(fileUrl) : undefined;
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

export async function reconcileOpenEgressJobs(jobs: EgressJobLike[]) {
	const open = jobs.filter((job) => OPEN_STATUSES.has(job.status));
	if (open.length === 0) {
		await maybeEnqueueMergesForJobs(jobs);
		return jobs;
	}

	await Promise.all(open.map((job) => reconcileEgressJob(job)));
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
		if (!job.livekitEgressId || isTrackMergeEgressJob(job)) {
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

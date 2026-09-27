import { EgressStatus } from "@livekit/protocol";
import { updateEgressJob } from "@repo/database";
import { listEgress, stopEgress } from "@repo/livekit";
import { logger } from "@repo/logs";

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

type EgressJobLike = {
	id: string;
	status: string;
	livekitEgressId?: string | null;
	roomName?: string | null;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
};

export async function reconcileEgressJob(job: EgressJobLike) {
	if (!OPEN_STATUSES.has(job.status)) {
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

		return await updateEgressJob(job.id, {
			status: mapLivekitEgressStatus(info.status),
			fileUrl: fileUrl ?? undefined,
			outputUrls,
			errorMessage: info.error || undefined,
			durationMs: egressDurationMs(info),
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
		return jobs;
	}

	await Promise.all(open.map((job) => reconcileEgressJob(job)));
	return jobs;
}

/** Best-effort stop + refresh for open egress jobs before room delete. */
export async function finalizeSessionEgressJobs(jobs: EgressJobLike[]) {
	const open = jobs.filter((job) => OPEN_STATUSES.has(job.status));
	for (const job of open) {
		if (!job.livekitEgressId) {
			continue;
		}
		try {
			await stopEgress(job.livekitEgressId);
		} catch (error) {
			logger.warn("Failed to stop egress before session end", {
				egressJobId: job.id,
				livekitEgressId: job.livekitEgressId,
				error,
			});
		}
	}
	await Promise.all(open.map((job) => reconcileEgressJob(job)));
}

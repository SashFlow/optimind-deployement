import {
	createEgressJob,
	listEgressJobsByAgentSessionId,
} from "@repo/database";
import { enqueueMergeTracks } from "@repo/jobs";
import { getEgressS3Config, recordingFilepath } from "@repo/livekit";
import { logger } from "@repo/logs";

const OPEN_STATUSES = new Set(["STARTING", "ACTIVE", "ENDING"]);
const TERMINAL_STATUSES = new Set(["COMPLETE", "FAILED", "ABORTED"]);
const SOURCE_JOB_TYPES = new Set(["TRACK", "PARTICIPANT"]);

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function isTrackMergeJob(job: { type: string; metadata: unknown }): boolean {
	if (job.type !== "ROOM_COMPOSITE") {
		return false;
	}
	return asRecord(job.metadata).source === "track_merge";
}

function trackRole(metadata: unknown): string | null {
	const role = asRecord(metadata).role;
	return typeof role === "string" ? role : null;
}

function hasResolvableFile(job: {
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	destination?: unknown;
}): boolean {
	if (job.fileUrl?.trim()) {
		return true;
	}
	if (job.outputUrls?.some((u) => u?.trim())) {
		return true;
	}
	const filepath = asRecord(job.destination).filepath;
	return typeof filepath === "string" && Boolean(filepath.trim());
}

function isUsableSourceJob(job: {
	status: string;
	metadata: unknown;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	destination?: unknown;
}): boolean {
	if (job.status !== "COMPLETE" || !hasResolvableFile(job)) {
		return false;
	}
	const role = trackRole(job.metadata);
	return (
		role === "participant" ||
		role === "agent_audio" ||
		role === "user_video" ||
		role === "user_audio"
	);
}

/**
 * When every track egress for a session is terminal, create a merge
 * EgressJob and enqueue BullMQ work. Soft-fails (logs) if Redis is unavailable.
 * Also accepts legacy PARTICIPANT jobs from older workers.
 */
export async function maybeEnqueueSessionTrackMerge(
	agentSessionId: string,
): Promise<void> {
	try {
		const jobs = await listEgressJobsByAgentSessionId(agentSessionId);
		const sourceJobs = jobs.filter((job) => SOURCE_JOB_TYPES.has(job.type));
		if (sourceJobs.length === 0) {
			return;
		}

		if (sourceJobs.some((job) => OPEN_STATUSES.has(job.status))) {
			return;
		}

		if (!sourceJobs.every((job) => TERMINAL_STATUSES.has(job.status))) {
			return;
		}

		const existingMerge = jobs.find(
			(job) =>
				(isTrackMergeJob(job) ||
					job.livekitEgressId === `track-merge:${agentSessionId}`) &&
				job.status !== "FAILED" &&
				job.status !== "ABORTED",
		);
		// STARTING means the row exists but BullMQ may have failed to accept
		// the job (e.g. bad custom id). Re-enqueue instead of bailing out.
		if (existingMerge) {
			if (existingMerge.status !== "STARTING") {
				return;
			}
			try {
				await enqueueMergeTracks({
					sessionId: agentSessionId,
					organizationId: existingMerge.organizationId,
					mergeJobId: existingMerge.id,
				});
			} catch (error) {
				logger.error("Failed to re-enqueue merge-tracks job", {
					agentSessionId,
					mergeJobId: existingMerge.id,
					error,
				});
			}
			return;
		}

		const organizationId = sourceJobs[0]?.organizationId;
		const roomName = sourceJobs.find((j) => j.roomName)?.roomName;
		const agentId = sourceJobs.find((j) => j.agentId)?.agentId ?? undefined;
		const campaignSessionId =
			sourceJobs.find((j) => j.campaignSessionId)?.campaignSessionId ??
			undefined;

		if (!organizationId || !roomName) {
			logger.warn("Skipping track merge — missing org or room", {
				agentSessionId,
				organizationId,
				roomName,
			});
			return;
		}

		const completeWithFiles = sourceJobs.filter(isUsableSourceJob);
		if (completeWithFiles.length === 0) {
			logger.info("Skipping track merge — no usable COMPLETE files", {
				agentSessionId,
				sourceJobCount: sourceJobs.length,
			});
			return;
		}

		const s3 = getEgressS3Config();
		const filepath = recordingFilepath({
			organizationId,
			sessionId: agentSessionId,
			roomName,
		});

		const mergeJob = await createEgressJob({
			organizationId,
			type: "ROOM_COMPOSITE",
			agentSessionId,
			agentId,
			campaignSessionId,
			livekitEgressId: `track-merge:${agentSessionId}`,
			roomName,
			status: "STARTING",
			startedAt: new Date(),
			destination: s3
				? {
						bucket: s3.bucket,
						region: s3.region,
						filepath,
						endpoint: s3.endpoint ?? null,
					}
				: { filepath },
			fileUrl: s3 ? `s3://${s3.bucket}/${filepath}` : undefined,
			outputUrls: s3 ? [`s3://${s3.bucket}/${filepath}`] : [],
			metadata: {
				source: "track_merge",
				trackJobIds: sourceJobs.map((j) => j.id),
			},
		});

		try {
			await enqueueMergeTracks({
				sessionId: agentSessionId,
				organizationId,
				mergeJobId: mergeJob.id,
			});
		} catch (error) {
			logger.error("Failed to enqueue merge-tracks job", {
				agentSessionId,
				mergeJobId: mergeJob.id,
				error,
			});
		}
	} catch (error) {
		logger.error("maybeEnqueueSessionTrackMerge failed", {
			agentSessionId,
			error,
		});
	}
}

import { logger } from "@repo/logs";
import { getMergeTracksQueue } from "./queues";
import {
	MERGE_TRACKS_JOB_NAME,
	type MergeTracksJobData,
	mergeTracksJobDataSchema,
	mergeTracksJobId,
} from "./types";

export async function enqueueMergeTracks(
	data: MergeTracksJobData,
): Promise<{ jobId: string; enqueued: boolean }> {
	const payload = mergeTracksJobDataSchema.parse(data);
	const jobId = mergeTracksJobId(payload.sessionId);
	const queue = getMergeTracksQueue();

	const existing = await queue.getJob(jobId);
	if (existing) {
		const state = await existing.getState();
		if (
			state === "completed" ||
			state === "active" ||
			state === "waiting" ||
			state === "delayed" ||
			state === "prioritized" ||
			state === "waiting-children"
		) {
			logger.info("merge-tracks job already present", {
				jobId,
				state,
				sessionId: payload.sessionId,
			});
			return { jobId, enqueued: false };
		}
		// Failed / unknown — remove so we can re-add with a fresh attempt budget.
		await existing.remove();
	}

	await queue.add(MERGE_TRACKS_JOB_NAME, payload, { jobId });
	logger.info("Enqueued merge-tracks job", {
		jobId,
		sessionId: payload.sessionId,
		mergeJobId: payload.mergeJobId,
	});
	return { jobId, enqueued: true };
}

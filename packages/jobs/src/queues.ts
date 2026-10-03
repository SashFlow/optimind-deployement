import { Queue } from "bullmq";
import { getBullMqConnection } from "./connection";
import { MERGE_TRACKS_QUEUE, type MergeTracksJobData } from "./types";

let mergeTracksQueue: Queue<MergeTracksJobData> | null = null;

export function getMergeTracksQueue(): Queue<MergeTracksJobData> {
	if (!mergeTracksQueue) {
		mergeTracksQueue = new Queue<MergeTracksJobData>(MERGE_TRACKS_QUEUE, {
			connection: getBullMqConnection(),
			defaultJobOptions: {
				attempts: 3,
				backoff: { type: "exponential", delay: 5000 },
				removeOnComplete: { count: 1000 },
				removeOnFail: { count: 5000 },
			},
		});
	}
	return mergeTracksQueue;
}

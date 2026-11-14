import { Worker } from "bullmq";
import {
	getBullMqConnection,
	MERGE_TRACKS_JOB_NAME,
	MERGE_TRACKS_QUEUE,
	type MergeTracksJobData,
	mergeTracksJobDataSchema,
} from "@repo/jobs";
import { logger } from "@repo/logs";
import { handleMergeTracks } from "./handlers/merge-tracks";

const connection = getBullMqConnection();

const worker = new Worker<MergeTracksJobData>(
	MERGE_TRACKS_QUEUE,
	async (job) => {
		if (job.name !== MERGE_TRACKS_JOB_NAME) {
			logger.warn("Ignoring unexpected job name", {
				name: job.name,
				id: job.id,
			});
			return;
		}
		const data = mergeTracksJobDataSchema.parse(job.data);
		await handleMergeTracks(data);
	},
	{
		connection,
		concurrency: 1,
	},
);

worker.on("ready", () => {
	logger.info("Track-merge worker ready", { queue: MERGE_TRACKS_QUEUE });
});

worker.on("failed", (job, error) => {
	logger.error("Track-merge job failed", {
		jobId: job?.id,
		sessionId: job?.data?.sessionId,
		attemptsMade: job?.attemptsMade,
		error,
	});
});

worker.on("completed", (job) => {
	logger.info("Track-merge job completed", {
		jobId: job.id,
		sessionId: job.data.sessionId,
	});
});

async function shutdown(signal: string) {
	logger.info("Shutting down worker", { signal });
	await worker.close();
	process.exit(0);
}

process.on("SIGTERM", () => {
	void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
	void shutdown("SIGINT");
});

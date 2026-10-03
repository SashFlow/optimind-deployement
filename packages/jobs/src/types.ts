import { z } from "zod";

export const MERGE_TRACKS_QUEUE = "merge-tracks" as const;
export const MERGE_TRACKS_JOB_NAME = "merge-tracks" as const;

export const mergeTracksJobDataSchema = z.object({
	sessionId: z.string().min(1),
	organizationId: z.string().min(1),
	mergeJobId: z.string().min(1),
});

export type MergeTracksJobData = z.infer<typeof mergeTracksJobDataSchema>;

/** BullMQ custom job ids cannot contain `:`. */
export function mergeTracksJobId(sessionId: string): string {
	return `merge-tracks-${sessionId}`;
}

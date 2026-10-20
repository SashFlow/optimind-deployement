import { z } from "zod";

export const sessionGeoSchema = z.object({
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
	accuracy: z.number().nonnegative().optional(),
	capturedAt: z.string().min(1),
	status: z.enum(["granted", "denied", "unavailable", "skipped"]),
});

export type SessionGeoPayload = z.infer<typeof sessionGeoSchema>;

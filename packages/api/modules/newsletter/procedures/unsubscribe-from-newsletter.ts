import { logger } from "@repo/logs";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

/**
 * Newsletter unsubscribe endpoint (token or email).
 * Wire to CRM when marketing list storage is introduced.
 */
export const unsubscribeFromNewsletter = publicProcedure
	.route({
		method: "POST",
		path: "/newsletter/unsubscribe",
		tags: ["Newsletter"],
		summary: "Unsubscribe from newsletter",
	})
	.input(
		z.object({
			email: z.string().email(),
			token: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		logger.info("Newsletter unsubscribe requested", {
			email: input.email,
			hasToken: Boolean(input.token),
		});
		// Persist suppression in CRM / marketing table when available.
		return { unsubscribed: true as const };
	});

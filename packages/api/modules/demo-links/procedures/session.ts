import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";
import { getDemoLinkByToken, reduceSession } from "@repo/database";

export const validateToken = publicProcedure
	.route({
		method: "POST",
		path: "/links/validate",
		tags: ["Links"],
		summary: "Session Decode",
	})
	.input(
		z.object({
			token: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const { token } = input;

		try {
			return await getDemoLinkByToken(token);
		} catch (error) {
			logger.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

export const useSession = publicProcedure
	.route({
		method: "POST",
		path: "/links/use",
		tags: ["Links"],
		summary: "Enable Link",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const { id } = input;
		try {
			return await reduceSession(id);
		} catch (error) {
			logger.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

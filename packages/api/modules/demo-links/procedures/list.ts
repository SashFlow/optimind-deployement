import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDemoLink } from "@repo/database";

export const listLink = protectedProcedure
	.route({
		method: "GET",
		path: "/links/list",
		tags: ["Links"],
		summary: "List Link",
	})
	.input(
		z.object({
			query: z.string().optional(),
			limit: z.number().min(1).max(100).default(10),
			offset: z.number().min(0).default(0),
		}),
	)
	.handler(async ({ input }) => {
		const { query, limit, offset } = input;

		try {
			return await getDemoLink({ limit, offset, query });
		} catch (error) {
			logger.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

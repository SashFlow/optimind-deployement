import { ORPCError } from "@orpc/client";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { deleteDemoLink } from "@repo/database";

export const deleteLink = protectedProcedure
	.route({
		method: "POST",
		path: "/links/delete",
		tags: ["Links"],
		summary: "Delete Link",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const { id } = input;

		try {
			return await deleteDemoLink(id);
		} catch (error) {
			logger.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

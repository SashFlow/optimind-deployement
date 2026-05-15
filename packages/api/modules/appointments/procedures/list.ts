import { ORPCError } from "@orpc/server";
import { getAppointments } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

export const list = publicProcedure
	.route({
		method: "GET",
		path: "/appointments/list",
		tags: ["Appointments"],
		summary: "List bucket files and folders",
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
			return await getAppointments({ limit, offset, query });
		} catch (error) {
			logger.error(error);
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

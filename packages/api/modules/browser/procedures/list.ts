import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { listBrowserPrefix } from "../../../lib/gcs-browser";
import { protectedProcedure } from "../../../orpc/procedures";

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/browser/list",
		tags: ["Browser"],
		summary: "List bucket files and folders",
	})
	.input(
		z.object({
			prefix: z.string().optional().default(""),
		}),
	)
	.handler(async ({ input: { prefix } }) => {
		try {
			return await listBrowserPrefix(prefix);
		} catch (error) {
			if (error instanceof Error) {
				if (
					error.message === "Relative path traversal is not allowed"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: error.message,
					});
				}
				if (error.message === "GCP_BUCKET_NAME is not configured") {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: error.message,
					});
				}
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to list bucket files",
			});
		}
	});

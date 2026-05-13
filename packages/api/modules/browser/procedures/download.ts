import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { getDownloadUrl } from "../../../lib/gcs-browser";
import { protectedProcedure } from "../../../orpc/procedures";

export const download = protectedProcedure
	.route({
		method: "GET",
		path: "/browser/download",
		tags: ["Browser"],
		summary: "Get signed download URL for a file",
	})
	.input(
		z.object({
			path: z.string().min(1),
		}),
	)
	.handler(async ({ input: { path } }) => {
		try {
			const downloadUrl = await getDownloadUrl(path);
			return { downloadUrl };
		} catch (error) {
			if (error instanceof Error) {
				if (
					error.message ===
						"Relative path traversal is not allowed" ||
					error.message === "File path is required"
				) {
					throw new ORPCError("BAD_REQUEST", {
						message: error.message,
					});
				}
				if (error.message === "File not found") {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to create download URL",
			});
		}
	});

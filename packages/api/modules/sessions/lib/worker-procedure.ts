import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../../orpc/procedures";

export const workerProcedure = publicProcedure.use(
	async ({ context, next }) => {
		const expected = process.env.WORKER_API_KEY?.trim();
		if (!expected) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "WORKER_API_KEY is not configured",
			});
		}

		const provided =
			context.headers.get("x-worker-api-key") ??
			context.headers.get("X-Worker-Api-Key");

		if (!provided || provided !== expected) {
			throw new ORPCError("UNAUTHORIZED");
		}

		return next({
			context: {
				...context,
				workerAuthenticated: true as const,
			},
		});
	},
);

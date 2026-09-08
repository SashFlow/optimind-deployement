import { publicProcedure } from "../../../orpc/procedures";

export const workerProcedure = publicProcedure.use(
	async ({ context, next }) => {
		return next({
			context: {
				...context,
				workerAuthenticated: true as const,
			},
		});
	},
);

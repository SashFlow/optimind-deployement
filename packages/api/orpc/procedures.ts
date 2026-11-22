import { ORPCError, os } from "@orpc/server";
import { auth } from "@repo/auth";

export const publicProcedure = os.$context<{
	headers: Headers;
}>();

export const protectedProcedure = publicProcedure.use(
	async ({ context, next }) => {
		const session = await auth.api.getSession({
			headers: context.headers,
		});

		if (!session) {
			throw new ORPCError("UNAUTHORIZED");
		}

		return await next({
			context: {
				session: session.session,
				user: session.user,
			},
		});
	},
);

export const adminProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		if (context.user.role !== "admin") {
			throw new ORPCError("FORBIDDEN");
		}

		// Platform admins must have MFA enrolled (SOC2 / ISO privileged access).
		const twoFactorEnabled = Boolean(
			(context.user as { twoFactorEnabled?: boolean | null })
				.twoFactorEnabled,
		);
		if (!twoFactorEnabled && process.env.ENFORCE_ADMIN_MFA !== "false") {
			throw new ORPCError("FORBIDDEN", {
				message:
					"Two-factor authentication is required for platform administrators",
			});
		}

		return await next();
	},
);

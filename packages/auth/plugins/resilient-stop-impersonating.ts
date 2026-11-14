import type { BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthMiddleware,
	getSessionFromCtx,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/**
 * Better Auth's stopImpersonating restores the admin only from the signed
 * `admin_session` cookie. If that cookie is missing, invalid, or points at a
 * session row that no longer exists, it throws "Failed to find admin session".
 *
 * This before-hook short-circuits that endpoint and falls back to minting a
 * fresh admin session from `session.impersonatedBy` so Stop Impersonating
 * always recovers — without registering a conflicting endpoint path.
 */
export const resilientStopImpersonatingPlugin = () =>
	({
		id: "resilient-stop-impersonating",
		hooks: {
			before: [
				{
					matcher: (ctx) => ctx.path === "/admin/stop-impersonating",
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx);
						if (!session) {
							throw new APIError("UNAUTHORIZED");
						}
						if (!session.session.impersonatedBy) {
							throw new APIError("BAD_REQUEST", {
								message: "You are not impersonating anyone",
							});
						}

						const adminUser =
							await ctx.context.internalAdapter.findUserById(
								session.session.impersonatedBy,
							);
						if (!adminUser) {
							throw new APIError("INTERNAL_SERVER_ERROR", {
								message: "Failed to find user",
							});
						}

						const adminCookieName =
							ctx.context.createAuthCookie("admin_session").name;
						const adminCookie = await ctx.getSignedCookie(
							adminCookieName,
							ctx.context.secret,
						);

						let adminSession: {
							session: typeof session.session;
							user: typeof adminUser;
						} | null = null;
						let dontRememberMe = false;

						if (adminCookie) {
							const [adminSessionToken, dontRememberMeCookie] =
								adminCookie.split(":");
							dontRememberMe = Boolean(dontRememberMeCookie);
							const found =
								await ctx.context.internalAdapter.findSession(
									adminSessionToken,
								);
							if (
								found &&
								found.session.userId === adminUser.id
							) {
								adminSession = {
									session: found.session,
									user: found.user as typeof adminUser,
								};
							}
						}

						if (!adminSession) {
							const freshSession =
								await ctx.context.internalAdapter.createSession(
									adminUser.id,
									ctx,
									false,
								);
							if (!freshSession) {
								throw new APIError("INTERNAL_SERVER_ERROR", {
									message: "Failed to create admin session",
								});
							}
							adminSession = {
								session: freshSession,
								user: adminUser,
							};
							dontRememberMe = false;
						}

						await ctx.context.internalAdapter.deleteSession(
							session.session.token,
						);
						await setSessionCookie(
							ctx,
							adminSession,
							dontRememberMe,
						);
						await ctx.setSignedCookie(
							adminCookieName,
							"",
							ctx.context.secret,
							{
								...ctx.context.authCookies.sessionToken.options,
								maxAge: 0,
							},
						);

						return ctx.json(adminSession);
					}),
				},
			],
		},
	}) satisfies BetterAuthPlugin;

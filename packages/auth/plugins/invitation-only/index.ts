import { config } from "@repo/config";
import { getValidPendingInvitation } from "@repo/database";
import type { BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import { createAuthMiddleware } from "better-auth/plugins";

export const invitationOnlyPlugin = () =>
	({
		id: "invitationOnlyPlugin",
		hooks: {
			before: [
				{
					matcher: (context) =>
						context.path.startsWith("/sign-up/email"),
					handler: createAuthMiddleware(async (ctx) => {
						if (config.auth.enableSignup) {
							return;
						}

						const invitationId =
							typeof ctx.body?.invitationId === "string"
								? ctx.body.invitationId
								: undefined;

						if (invitationId) {
							const invitation =
								await getValidPendingInvitation(invitationId);
							if (!invitation) {
								throw new APIError("BAD_REQUEST", {
									code: "INVALID_INVITATION",
									message: "Invalid or expired invitation",
								});
							}
							// Force email from invitation — do not trust client.
							return {
								context: {
									...ctx,
									body: {
										...ctx.body,
										email: invitation.email,
									},
								},
							};
						}

						throw new APIError("BAD_REQUEST", {
							code: "INVALID_INVITATION",
							message: "An invitation is required to sign up",
						});
					}),
				},
			],
		},
		$ERROR_CODES: {
			INVALID_INVITATION: "Invalid or expired invitation",
		},
	}) satisfies BetterAuthPlugin;

import {
	getFullOrganizationByIdOrSlug,
	getOrganizationBySlug,
	listAllOrganizations,
} from "@repo/database";
import type { BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthMiddleware,
	getSessionFromCtx,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

function isPlatformAdmin(user: Record<string, unknown> | null | undefined) {
	return user?.role === "admin";
}

function asOptionalString(value: unknown) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Platform admins (`user.role === "admin"`) can list, activate, and load any
 * organization without being a member. Uses before-hooks to short-circuit the
 * stock organization endpoints (avoids Better Auth path conflicts).
 */
export const platformAdminOrgAccessPlugin = () =>
	({
		id: "platform-admin-org-access",
		hooks: {
			before: [
				{
					matcher: (ctx) => ctx.path === "/organization/list",
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx);
						if (!session || !isPlatformAdmin(session.user)) {
							return;
						}
						return ctx.json(await listAllOrganizations());
					}),
				},
				{
					matcher: (ctx) =>
						ctx.path === "/organization/get-full-organization",
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx);
						if (!session || !isPlatformAdmin(session.user)) {
							return;
						}

						const query = (ctx.query ?? {}) as Record<
							string,
							unknown
						>;
						const organizationSlug = asOptionalString(
							query.organizationSlug,
						);
						const organizationIdFromQuery = asOptionalString(
							query.organizationId,
						);
						const membersLimitRaw = query.membersLimit;
						const membersLimit =
							typeof membersLimitRaw === "string"
								? Number.parseInt(membersLimitRaw, 10)
								: typeof membersLimitRaw === "number"
									? membersLimitRaw
									: 100;

						const organizationId =
							organizationIdFromQuery ||
							(!organizationSlug
								? session.session.activeOrganizationId
								: null);

						const organization =
							await getFullOrganizationByIdOrSlug({
								organizationId,
								organizationSlug,
								membersLimit: Number.isFinite(membersLimit)
									? membersLimit
									: 100,
							});

						if (!organization) {
							if (!organizationIdFromQuery && !organizationSlug) {
								return ctx.json(null);
							}
							throw new APIError("BAD_REQUEST", {
								message: "Organization not found",
							});
						}

						return ctx.json(organization);
					}),
				},
				{
					matcher: (ctx) => ctx.path === "/organization/set-active",
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx);
						if (!session || !isPlatformAdmin(session.user)) {
							return;
						}

						const body = (ctx.body ?? {}) as Record<
							string,
							unknown
						>;
						let organizationId =
							body.organizationId === null
								? null
								: asOptionalString(body.organizationId);
						const organizationSlug = asOptionalString(
							body.organizationSlug,
						);

						if (organizationId === null) {
							if (!session.session.activeOrganizationId) {
								return ctx.json(null);
							}
							const updatedSession =
								await ctx.context.internalAdapter.updateSession(
									session.session.token,
									{ activeOrganizationId: null },
								);
							await setSessionCookie(ctx, {
								session: updatedSession,
								user: session.user,
							});
							return ctx.json(null);
						}

						if (!organizationId && !organizationSlug) {
							organizationId =
								session.session.activeOrganizationId ??
								undefined;
							if (!organizationId) {
								return ctx.json(null);
							}
						}

						if (organizationSlug && !organizationId) {
							const bySlug =
								await getOrganizationBySlug(organizationSlug);
							if (!bySlug) {
								throw new APIError("BAD_REQUEST", {
									message: "Organization not found",
								});
							}
							organizationId = bySlug.id;
						}

						if (!organizationId) {
							throw new APIError("BAD_REQUEST", {
								message: "Organization not found",
							});
						}

						const organization =
							await getFullOrganizationByIdOrSlug({
								organizationId,
							});
						if (!organization) {
							throw new APIError("BAD_REQUEST", {
								message: "Organization not found",
							});
						}

						const updatedSession =
							await ctx.context.internalAdapter.updateSession(
								session.session.token,
								{ activeOrganizationId: organization.id },
							);
						await setSessionCookie(ctx, {
							session: updatedSession,
							user: session.user,
						});

						const {
							members: _members,
							invitations: _invitations,
							...org
						} = organization;
						return ctx.json(org);
					}),
				},
			],
		},
	}) satisfies BetterAuthPlugin;

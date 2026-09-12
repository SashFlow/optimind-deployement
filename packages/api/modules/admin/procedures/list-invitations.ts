import { ORPCError } from "@orpc/server";
import { listPendingInvitationsByOrganization } from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

export const listInvitations = adminProcedure
	.route({
		method: "GET",
		path: "/admin/invitations",
		tags: ["Administration"],
		summary: "List pending organization invitations",
	})
	.input(
		z.object({
			organizationId: z.string().min(1),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		try {
			const invitations =
				await listPendingInvitationsByOrganization(organizationId);
			return {
				invitations: invitations.map((invitation) => ({
					id: invitation.id,
					email: invitation.email,
					role: invitation.role ?? "member",
					organizationId: invitation.organizationId,
					expiresAt: invitation.expiresAt.toISOString(),
					status: invitation.status,
				})),
			};
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					error instanceof Error
						? error.message
						: "Unable to list invitations.",
			});
		}
	});

import { ORPCError } from "@orpc/server";
import { inviteToOrganization } from "@repo/auth";
import { getOrganizationById } from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

const orgRoleSchema = z.enum(["owner", "admin", "member"]);
const platformRoleSchema = z.enum(["admin", "user"]);

export const reinviteMember = adminProcedure
	.route({
		method: "POST",
		path: "/admin/invitations/reinvite",
		tags: ["Administration"],
		summary:
			"Rotate invitation token (delete pending, create new) and resend email",
	})
	.input(
		z.object({
			email: z.string().email(),
			organizationId: z.string().min(1),
			role: orgRoleSchema.default("member"),
			platformRole: platformRoleSchema.default("user"),
		}),
	)
	.handler(async ({ input, context }) => {
		const organization = await getOrganizationById(input.organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND", {
				message: "Organization not found.",
			});
		}

		try {
			return await inviteToOrganization({
				email: input.email,
				role: input.role,
				platformRole: input.platformRole,
				organizationId: input.organizationId,
				inviterId: context.user.id,
			});
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					error instanceof Error
						? error.message
						: "Unable to reinvite.",
			});
		}
	});

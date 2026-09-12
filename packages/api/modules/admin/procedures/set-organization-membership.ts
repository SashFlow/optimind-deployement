import { ORPCError } from "@orpc/client";
import {
	getOrganizationById,
	getUserById,
	updateOrganizationMembershipRole,
	upsertOrganizationMembership,
} from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

const organizationMemberRoleSchema = z.enum(["owner", "admin", "member"]);

export const setOrganizationMembership = adminProcedure
	.route({
		method: "POST",
		path: "/admin/users/organization-membership",
		tags: ["Administration"],
		summary: "Set a user's organization membership role",
	})
	.input(
		z.object({
			userId: z.string().min(1),
			organizationId: z.string().min(1),
			role: organizationMemberRoleSchema,
			memberId: z.string().min(1).optional(),
		}),
	)
	.handler(async ({ input: { userId, organizationId, role, memberId } }) => {
		const [user, organization] = await Promise.all([
			getUserById(userId),
			getOrganizationById(organizationId),
		]);

		if (!user) {
			throw new ORPCError("NOT_FOUND", {
				message: "User not found.",
			});
		}

		if (!organization) {
			throw new ORPCError("NOT_FOUND", {
				message: "Organization not found.",
			});
		}

		if (memberId) {
			const membership = await updateOrganizationMembershipRole({
				memberId,
				role,
			});
			return { membership };
		}

		const membership = await upsertOrganizationMembership({
			userId,
			organizationId,
			role,
		});

		return { membership };
	});

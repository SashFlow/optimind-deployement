import { ORPCError } from "@orpc/server";
import { revokeOrganizationInvite } from "@repo/auth";
import { getOrganizationById } from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

export const revokeInvite = adminProcedure
	.route({
		method: "POST",
		path: "/admin/invitations/revoke",
		tags: ["Administration"],
		summary:
			"Delete pending invitations, remove org membership, delete unused user",
	})
	.input(
		z.object({
			email: z.string().email(),
			organizationId: z.string().min(1),
		}),
	)
	.handler(async ({ input }) => {
		const organization = await getOrganizationById(input.organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND", {
				message: "Organization not found.",
			});
		}

		try {
			return await revokeOrganizationInvite({
				email: input.email,
				organizationId: input.organizationId,
			});
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					error instanceof Error
						? error.message
						: "Unable to revoke invitation.",
			});
		}
	});

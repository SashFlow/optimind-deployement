import { ORPCError } from "@orpc/server";
import { validateInvitation } from "@repo/auth";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

export const getInvitation = publicProcedure
	.route({
		method: "GET",
		path: "/auth/invitation",
		tags: ["Auth"],
		summary: "Validate an invitation token and return its details",
	})
	.input(
		z.object({
			invitationId: z.string().min(1),
		}),
	)
	.handler(async ({ input: { invitationId } }) => {
		const invitation = await validateInvitation(invitationId);
		if (!invitation) {
			throw new ORPCError("NOT_FOUND", {
				message: "Invalid or expired invitation.",
			});
		}
		return { invitation };
	});

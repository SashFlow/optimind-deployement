import {
	listAvatars as listAnamAvatars,
	listPersonas as listAnamPersonas,
} from "@repo/anam";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

export const listRemote = protectedProcedure
	.route({
		method: "GET",
		path: "/avatars/remote",
		tags: ["Avatars"],
		summary: "List Anam personas/avatars",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const [personas, avatars] = await Promise.all([
			listAnamPersonas(),
			listAnamAvatars(),
		]);
		return { personas, avatars };
	});

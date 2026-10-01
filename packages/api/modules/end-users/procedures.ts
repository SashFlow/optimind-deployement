import { ORPCError } from "@orpc/client";
import { getEndUserById, listEndUsers, setEndUserMemory } from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { withSignedFileUrls } from "../sessions/lib/end-user-files";
import { requireOrgMembership } from "../shared/require-org-membership";

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/end-users",
		tags: ["End users"],
		summary: "List end users (search by name, email, phone or identity)",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().optional(),
			q: z.string().max(200).optional(),
			take: z.number().int().min(1).max(100).optional(),
			skip: z.number().int().min(0).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const endUsers = await listEndUsers(input.organizationId, input);
		return { endUsers };
	});

export const get = protectedProcedure
	.route({
		method: "GET",
		path: "/end-users/{id}",
		tags: ["End users"],
		summary: "Get end user with memories, files and recent sessions",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const endUser = await getEndUserById(input.id);
		if (!endUser) {
			throw new ORPCError("NOT_FOUND");
		}
		await requireOrgMembership(endUser.organizationId, context.user.id);

		const sessions = await Promise.all(
			endUser.sessions.map(async (session) => ({
				...session,
				files: await withSignedFileUrls(session.files),
			})),
		);
		return { endUser: { ...endUser, sessions } };
	});

export const updateMemory = protectedProcedure
	.route({
		method: "PUT",
		path: "/end-users/{id}/memory",
		tags: ["End users"],
		summary: "Replace an end user's memories",
	})
	.input(
		z.object({
			id: z.string(),
			memory: z.array(z.string().trim().min(1).max(200)).max(50),
		}),
	)
	.handler(async ({ input, context }) => {
		const endUser = await getEndUserById(input.id);
		if (!endUser) {
			throw new ORPCError("NOT_FOUND");
		}
		await requireOrgMembership(endUser.organizationId, context.user.id);
		return { endUser: await setEndUserMemory(input.id, input.memory) };
	});

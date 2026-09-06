import { ORPCError } from "@orpc/client";
import {
	attachKnowledgeBaseToAgent,
	createAgent,
	detachKnowledgeBaseFromAgent,
	getAgentById,
	listAgents,
	publishAgentVersion,
	updateAgent,
	updateAgentDraftConfig,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import { agentConfigSchema } from "./lib/agent-config";

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/agents",
		tags: ["Agents"],
		summary: "List agents",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const agents = await listAgents(input.organizationId);
		return { agents };
	});

export const get = protectedProcedure
	.route({
		method: "GET",
		path: "/agents/{id}",
		tags: ["Agents"],
		summary: "Get agent",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const agent = await getAgentById(input.id);
		if (!agent) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(agent.organizationId, context.user.id);
		return { agent };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/agents",
		tags: ["Agents"],
		summary: "Create agent",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1),
			description: z.string().optional(),
			config: agentConfigSchema.optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const agent = await createAgent({
			organizationId: input.organizationId,
			name: input.name,
			description: input.description,
			config: (input.config ?? {}) as object,
		});
		return { agent };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/agents/{id}",
		tags: ["Agents"],
		summary: "Update agent",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().optional(),
			description: z.string().nullable().optional(),
			status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
			embedEnabled: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getAgentById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const { id, ...data } = input;
		const agent = await updateAgent(id, data);
		return { agent };
	});

export const updateConfig = protectedProcedure
	.route({
		method: "PUT",
		path: "/agents/{id}/config",
		tags: ["Agents"],
		summary: "Update agent draft config",
	})
	.input(
		z.object({
			id: z.string(),
			config: agentConfigSchema,
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getAgentById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const version = await updateAgentDraftConfig(
			input.id,
			input.config as object,
		);
		return { version };
	});

export const publish = protectedProcedure
	.route({
		method: "POST",
		path: "/agents/{id}/publish",
		tags: ["Agents"],
		summary: "Publish agent draft version",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const existing = await getAgentById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const agent = await publishAgentVersion(input.id);
		return { agent };
	});

export const attachKnowledgeBase = protectedProcedure
	.route({
		method: "POST",
		path: "/agents/{id}/knowledge-bases",
		tags: ["Agents"],
		summary: "Attach knowledge base to agent",
	})
	.input(
		z.object({
			id: z.string(),
			knowledgeBaseId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getAgentById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const link = await attachKnowledgeBaseToAgent(
			input.id,
			input.knowledgeBaseId,
		);
		return { link };
	});

export const detachKnowledgeBase = protectedProcedure
	.route({
		method: "DELETE",
		path: "/agents/{id}/knowledge-bases/{knowledgeBaseId}",
		tags: ["Agents"],
		summary: "Detach knowledge base from agent",
	})
	.input(
		z.object({
			id: z.string(),
			knowledgeBaseId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getAgentById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		await detachKnowledgeBaseFromAgent(input.id, input.knowledgeBaseId);
		return { success: true };
	});

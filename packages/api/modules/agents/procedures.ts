import { ORPCError } from "@orpc/client";
import {
	attachKnowledgeBaseToAgent,
	createAgentTrial,
	deleteAgentTrial,
	createAgent,
	detachKnowledgeBaseFromAgent,
	getAgentById,
	getAgentTrialById,
	listAgentTrials,
	listAgents,
	publishAgentVersion,
	syncAgentKnowledgeBases,
	updateAgentTrial,
	updateAgent,
	updateAgentDraftConfig,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { recordAudit } from "../shared/audit";
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
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: agent.organizationId,
			actionType: "CREATE",
			resourceType: "agent",
			resourceId: agent.id,
			after: {
				name: agent.name,
				description: agent.description,
				status: agent.status,
			},
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
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: existing.organizationId,
			actionType: data.status === "DELETED" ? "DELETE" : "UPDATE",
			resourceType: "agent",
			resourceId: agent.id,
			before: {
				name: existing.name,
				description: existing.description,
				status: existing.status,
				embedEnabled: existing.embedEnabled,
			},
			after: {
				name: agent.name,
				description: agent.description,
				status: agent.status,
				embedEnabled: agent.embedEnabled,
			},
		});
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
		if (Array.isArray(input.config.knowledge_base_ids)) {
			await syncAgentKnowledgeBases(
				input.id,
				input.config.knowledge_base_ids,
			);
		}
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: existing.organizationId,
			actionType: "UPDATE",
			resourceType: "agent_version",
			resourceId: version.id,
			before: {
				agentId: existing.id,
				draftVersionId: existing.draftVersionId,
			},
			after: {
				agentId: existing.id,
				versionId: version.id,
				configKeys: Object.keys(input.config ?? {}),
			},
		});
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
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: existing.organizationId,
			actionType: "PUBLISH",
			resourceType: "agent",
			resourceId: agent.id,
			before: {
				draftVersionId: existing.draftVersionId,
				publishedVersionId: existing.publishedVersionId,
			},
			after: {
				draftVersionId: agent.draftVersionId,
				publishedVersionId: agent.publishedVersionId,
			},
		});
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
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: existing.organizationId,
			actionType: "UPDATE",
			resourceType: "agent",
			resourceId: existing.id,
			after: { knowledgeBaseId: input.knowledgeBaseId, attached: true },
		});
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
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: existing.organizationId,
			actionType: "UPDATE",
			resourceType: "agent",
			resourceId: existing.id,
			after: { knowledgeBaseId: input.knowledgeBaseId, attached: false },
		});
		return { success: true };
	});

const trialLinkInputSchema = z.object({
	label: z.string().min(1).max(80),
	sessions: z.number().int().min(1).max(10_000),
	expiresAt: z.string().datetime().nullable().optional(),
});

export const listTrialLinks = protectedProcedure
	.route({
		method: "GET",
		path: "/agents/{id}/trial-links",
		tags: ["Agents"],
		summary: "List trial links",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const agent = await getAgentById(input.id);
		if (!agent) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(agent.organizationId, context.user.id);
		const trials = await listAgentTrials(agent.id);
		return { trials };
	});

export const createTrialLink = protectedProcedure
	.route({
		method: "POST",
		path: "/agents/{id}/trial-links",
		tags: ["Agents"],
		summary: "Create trial link",
	})
	.input(z.object({ id: z.string() }).merge(trialLinkInputSchema))
	.handler(async ({ input, context }) => {
		const agent = await getAgentById(input.id);
		if (!agent) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(agent.organizationId, context.user.id);

		const trial = await createAgentTrial({
			agentId: agent.id,
			label: input.label.trim(),
			usageLimit: input.sessions,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		});
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: agent.organizationId,
			actionType: "CREATE",
			resourceType: "agent_access",
			resourceId: trial.id,
			after: {
				agentId: agent.id,
				label: trial.label,
				usageLimit: trial.usageLimit,
				expiresAt: trial.expiresAt,
			},
		});
		return { trial };
	});

export const updateTrialLink = protectedProcedure
	.route({
		method: "PATCH",
		path: "/agents/{id}/trial-links/{trialId}",
		tags: ["Agents"],
		summary: "Update trial link",
	})
	.input(
		z.object({
			id: z.string(),
			trialId: z.string(),
			label: z.string().min(1).max(80).optional(),
			sessions: z.number().int().min(1).max(10_000).optional(),
			expiresAt: z.string().datetime().nullable().optional(),
			enabled: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const agent = await getAgentById(input.id);
		if (!agent) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(agent.organizationId, context.user.id);

		const trial = await getAgentTrialById(input.trialId);
		if (!trial || trial.agentId !== agent.id)
			throw new ORPCError("NOT_FOUND");

		const updated = await updateAgentTrial(trial.id, {
			label: input.label?.trim(),
			usageLimit: input.sessions,
			expiresAt:
				input.expiresAt === undefined
					? undefined
					: input.expiresAt
						? new Date(input.expiresAt)
						: null,
			enabled: input.enabled,
		});
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: agent.organizationId,
			actionType: "UPDATE",
			resourceType: "agent_access",
			resourceId: updated.id,
			before: {
				label: trial.label,
				usageLimit: trial.usageLimit,
				expiresAt: trial.expiresAt,
				enabled: trial.enabled,
			},
			after: {
				label: updated.label,
				usageLimit: updated.usageLimit,
				expiresAt: updated.expiresAt,
				enabled: updated.enabled,
			},
		});
		return { trial: updated };
	});

export const deleteTrialLink = protectedProcedure
	.route({
		method: "DELETE",
		path: "/agents/{id}/trial-links/{trialId}",
		tags: ["Agents"],
		summary: "Delete trial link",
	})
	.input(z.object({ id: z.string(), trialId: z.string() }))
	.handler(async ({ input, context }) => {
		const agent = await getAgentById(input.id);
		if (!agent) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(agent.organizationId, context.user.id);

		const trial = await getAgentTrialById(input.trialId);
		if (!trial || trial.agentId !== agent.id)
			throw new ORPCError("NOT_FOUND");
		await deleteAgentTrial(trial.id);
		await recordAudit({
			headers: context.headers,
			userId: context.user.id,
			organizationId: agent.organizationId,
			actionType: "DELETE",
			resourceType: "agent_access",
			resourceId: trial.id,
			before: {
				agentId: agent.id,
				label: trial.label,
			},
		});
		return { success: true };
	});

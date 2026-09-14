import { ORPCError } from "@orpc/client";
import { getOrganizationById } from "@repo/database";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	listOrgTools,
	toolDefinitionSchema,
	writeTools,
} from "./lib/org-tools";

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/tools",
		tags: ["Tools"],
		summary: "List agent tools for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().min(1),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const organization = await getOrganizationById(input.organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}
		return {
			tools: await listOrgTools(input.organizationId, {
				agentId: input.agentId,
			}),
		};
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/tools",
		tags: ["Tools"],
		summary: "Create agent tool",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().min(1),
			name: z.string().min(1),
			description: z.string().default(""),
			tool_type: z.enum(["http", "python"]),
			config: z.record(z.string(), z.unknown()).default({}),
			parameters_schema: z.record(z.string(), z.unknown()).default({}),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const organization = await getOrganizationById(input.organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}

		const tools = await listOrgTools(input.organizationId);
		const tool = toolDefinitionSchema.parse({
			id: nanoid(),
			agent_id: input.agentId,
			name: input.name,
			description: input.description,
			tool_type: input.tool_type,
			config: input.config,
			parameters_schema: input.parameters_schema,
		});
		await writeTools(input.organizationId, [...tools, tool]);
		return { tool };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/tools/{id}",
		tags: ["Tools"],
		summary: "Update agent tool",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
			name: z.string().min(1),
			description: z.string().default(""),
			tool_type: z.enum(["http", "python"]),
			config: z.record(z.string(), z.unknown()).default({}),
			parameters_schema: z.record(z.string(), z.unknown()).default({}),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const tools = await listOrgTools(input.organizationId);
		const index = tools.findIndex((tool) => tool.id === input.id);
		if (index === -1) {
			throw new ORPCError("NOT_FOUND");
		}

		const existing = tools[index];
		if (!existing) {
			throw new ORPCError("NOT_FOUND");
		}
		if (existing.tool_type !== input.tool_type) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Cannot change tool type after creation",
			});
		}

		const tool = toolDefinitionSchema.parse({
			id: existing.id,
			agent_id: existing.agent_id,
			name: input.name,
			description: input.description,
			tool_type: input.tool_type,
			config: input.config,
			parameters_schema: input.parameters_schema,
		});
		const next = [...tools];
		next[index] = tool;
		await writeTools(input.organizationId, next);
		return { tool };
	});

export const remove = protectedProcedure
	.route({
		method: "DELETE",
		path: "/tools/{id}",
		tags: ["Tools"],
		summary: "Delete agent tool",
	})
	.input(
		z.object({
			organizationId: z.string(),
			id: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const tools = await listOrgTools(input.organizationId);
		const index = tools.findIndex((tool) => tool.id === input.id);
		if (index === -1) {
			throw new ORPCError("NOT_FOUND");
		}

		const next = tools.filter((tool) => tool.id !== input.id);
		await writeTools(input.organizationId, next);
		return { success: true as const };
	});

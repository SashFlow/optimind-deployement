import { ORPCError } from "@orpc/client";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	listOrgTools,
	type ToolDefinition,
	toolDefinitionSchema,
} from "./lib/org-tools";

type OrgMetadata = {
	optimind_tools?: ToolDefinition[];
	[key: string]: unknown;
};

function parseMetadata(raw: string | null | undefined): OrgMetadata {
	if (!raw) {
		return {};
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as OrgMetadata;
		}
	} catch {
		// ignore invalid metadata
	}
	return {};
}

async function writeTools(organizationId: string, tools: ToolDefinition[]) {
	const organization = await getOrganizationById(organizationId);
	if (!organization) {
		throw new ORPCError("NOT_FOUND");
	}
	const metadata = parseMetadata(organization.metadata);
	metadata.optimind_tools = tools;
	await updateOrganization({
		id: organizationId,
		metadata: JSON.stringify(metadata),
	});
}

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/tools",
		tags: ["Tools"],
		summary: "List organization tools",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const organization = await getOrganizationById(input.organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}
		return { tools: await listOrgTools(input.organizationId) };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/tools",
		tags: ["Tools"],
		summary: "Create organization tool",
	})
	.input(
		z.object({
			organizationId: z.string(),
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
		const tool = toolDefinitionSchema.parse({
			id: nanoid(),
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
		summary: "Update organization tool",
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

import { ORPCError } from "@orpc/client";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

const toolDefinitionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	tool_type: z.enum(["http", "python"]),
	config: z.record(z.string(), z.unknown()),
	parameters_schema: z.record(z.string(), z.unknown()),
});

type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

type OrgMetadata = {
	optimind_tools?: ToolDefinition[];
	[key: string]: unknown;
};

function parseMetadata(raw: string | null | undefined): OrgMetadata {
	if (!raw) return {};
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

async function readTools(organizationId: string): Promise<ToolDefinition[]> {
	const organization = await getOrganizationById(organizationId);
	if (!organization) throw new ORPCError("NOT_FOUND");
	const metadata = parseMetadata(organization.metadata);
	return Array.isArray(metadata.optimind_tools)
		? metadata.optimind_tools
		: [];
}

async function writeTools(organizationId: string, tools: ToolDefinition[]) {
	const organization = await getOrganizationById(organizationId);
	if (!organization) throw new ORPCError("NOT_FOUND");
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
		return { tools: await readTools(input.organizationId) };
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
		const tools = await readTools(input.organizationId);
		const tool: ToolDefinition = {
			id: nanoid(),
			name: input.name,
			description: input.description,
			tool_type: input.tool_type,
			config: input.config,
			parameters_schema: input.parameters_schema,
		};
		await writeTools(input.organizationId, [...tools, tool]);
		return { tool };
	});

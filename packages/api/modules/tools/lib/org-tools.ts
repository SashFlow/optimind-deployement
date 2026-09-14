import { getOrganizationById, updateOrganization } from "@repo/database";
import { z } from "zod";

export const toolDefinitionSchema = z.object({
	id: z.string(),
	agent_id: z.string().min(1),
	name: z.string(),
	description: z.string(),
	tool_type: z.enum(["http", "python"]),
	config: z.record(z.string(), z.unknown()),
	parameters_schema: z.record(z.string(), z.unknown()),
});

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

type OrgMetadata = {
	optimind_tools?: unknown[];
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

function parseStoredTools(raw: unknown[] | undefined): {
	linked: ToolDefinition[];
	hadUnlinked: boolean;
} {
	if (!Array.isArray(raw)) {
		return { linked: [], hadUnlinked: false };
	}

	const linked: ToolDefinition[] = [];
	let hadUnlinked = false;

	for (const item of raw) {
		const parsed = toolDefinitionSchema.safeParse(item);
		if (parsed.success) {
			linked.push(parsed.data);
			continue;
		}
		hadUnlinked = true;
	}

	return { linked, hadUnlinked };
}

export async function writeTools(
	organizationId: string,
	tools: ToolDefinition[],
) {
	const organization = await getOrganizationById(organizationId);
	if (!organization) {
		throw new Error(`Organization not found: ${organizationId}`);
	}
	const metadata = parseMetadata(organization.metadata);
	metadata.optimind_tools = tools;
	await updateOrganization({
		id: organizationId,
		metadata: JSON.stringify(metadata),
	});
}

/**
 * Load org tools, purge any missing agent_id (or otherwise invalid), and
 * optionally filter to a single agent.
 */
export async function listOrgTools(
	organizationId: string,
	options?: { agentId?: string },
): Promise<ToolDefinition[]> {
	const organization = await getOrganizationById(organizationId);
	if (!organization) {
		return [];
	}
	const metadata = parseMetadata(organization.metadata);
	const { linked, hadUnlinked } = parseStoredTools(metadata.optimind_tools);

	if (hadUnlinked) {
		await writeTools(organizationId, linked);
	}

	if (options?.agentId) {
		return linked.filter((tool) => tool.agent_id === options.agentId);
	}
	return linked;
}

/** Resolve selected tool IDs to full definitions from org metadata. */
export async function resolveOrgToolsByIds(
	organizationId: string,
	toolIds: string[],
): Promise<ToolDefinition[]> {
	const uniqueIds = [
		...new Set(toolIds.map((id) => id.trim()).filter(Boolean)),
	];
	if (uniqueIds.length === 0) {
		return [];
	}

	const allTools = await listOrgTools(organizationId);
	const byId = new Map(allTools.map((tool) => [tool.id, tool]));

	const resolved: ToolDefinition[] = [];
	for (const id of uniqueIds) {
		const tool = byId.get(id);
		if (tool) {
			resolved.push(tool);
		}
	}
	return resolved;
}

export function collectDispatchToolIds(
	config: Record<string, unknown>,
): string[] {
	const byPhase = config.tools_by_phase;
	if (byPhase && typeof byPhase === "object" && !Array.isArray(byPhase)) {
		const onCall = (byPhase as { on_call?: unknown }).on_call;
		if (Array.isArray(onCall)) {
			return onCall.filter((id): id is string => typeof id === "string");
		}
	}
	if (Array.isArray(config.tools)) {
		return config.tools.filter(
			(id): id is string => typeof id === "string",
		);
	}
	return [];
}

export { parseMetadata };
export type { OrgMetadata };

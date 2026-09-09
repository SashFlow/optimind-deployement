import { getOrganizationById } from "@repo/database";
import { z } from "zod";

export const toolDefinitionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	tool_type: z.enum(["http", "python"]),
	config: z.record(z.string(), z.unknown()),
	parameters_schema: z.record(z.string(), z.unknown()),
});

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

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

export async function listOrgTools(
	organizationId: string,
): Promise<ToolDefinition[]> {
	const organization = await getOrganizationById(organizationId);
	if (!organization) return [];
	const metadata = parseMetadata(organization.metadata);
	if (!Array.isArray(metadata.optimind_tools)) return [];
	return metadata.optimind_tools.filter(
		(tool) => toolDefinitionSchema.safeParse(tool).success,
	);
}

/** Resolve selected tool IDs to full definitions from org metadata. */
export async function resolveOrgToolsByIds(
	organizationId: string,
	toolIds: string[],
): Promise<ToolDefinition[]> {
	const uniqueIds = [
		...new Set(toolIds.map((id) => id.trim()).filter(Boolean)),
	];
	if (uniqueIds.length === 0) return [];

	const allTools = await listOrgTools(organizationId);
	const byId = new Map(allTools.map((tool) => [tool.id, tool]));

	const resolved: ToolDefinition[] = [];
	for (const id of uniqueIds) {
		const tool = byId.get(id);
		if (tool) resolved.push(tool);
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

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

function stringIdsFrom(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((id): id is string => typeof id === "string");
}

/** All custom tool IDs referenced in draft config (every phase + flat tools). */
export function collectAllConfigToolIds(
	config: Record<string, unknown>,
): string[] {
	const ids: string[] = [];
	const byPhase = config.tools_by_phase;
	if (byPhase && typeof byPhase === "object" && !Array.isArray(byPhase)) {
		const phases = byPhase as Record<string, unknown>;
		ids.push(
			...stringIdsFrom(phases.pre_call),
			...stringIdsFrom(phases.on_call),
			...stringIdsFrom(phases.post_call),
		);
	}
	ids.push(...stringIdsFrom(config.tools));
	return [...new Set(ids)];
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

function remapToolIdList(
	ids: unknown,
	idMap: Map<string, string>,
): string[] | null {
	if (!Array.isArray(ids)) {
		return null;
	}
	return ids.map((id) => {
		if (typeof id !== "string") {
			return id as string;
		}
		return idMap.get(id) ?? id;
	});
}

/** Remap custom tool IDs inside a copied agent draft config. */
export function remapToolIdsInConfig(
	config: Record<string, unknown>,
	idMap: Map<string, string>,
): Record<string, unknown> {
	if (idMap.size === 0) {
		return config;
	}

	const next: Record<string, unknown> = { ...config };

	const tools = remapToolIdList(config.tools, idMap);
	if (tools) {
		next.tools = tools;
	}

	const byPhase = config.tools_by_phase;
	if (byPhase && typeof byPhase === "object" && !Array.isArray(byPhase)) {
		const phases = byPhase as Record<string, unknown>;
		next.tools_by_phase = {
			...phases,
			pre_call:
				remapToolIdList(phases.pre_call, idMap) ?? phases.pre_call,
			on_call: remapToolIdList(phases.on_call, idMap) ?? phases.on_call,
			post_call:
				remapToolIdList(phases.post_call, idMap) ?? phases.post_call,
		};
	}

	return next;
}

/**
 * Clone all org tools owned by `sourceAgentId` onto `targetAgentId`.
 * Returns a map of old tool id → new tool id.
 */
export async function cloneOrgToolsForAgent(params: {
	organizationId: string;
	sourceAgentId: string;
	targetAgentId: string;
	createId: () => string;
}): Promise<Map<string, string>> {
	const { organizationId, sourceAgentId, targetAgentId, createId } = params;
	const allTools = await listOrgTools(organizationId);
	const sourceTools = allTools.filter(
		(tool) => tool.agent_id === sourceAgentId,
	);
	if (sourceTools.length === 0) {
		return new Map();
	}

	const idMap = new Map<string, string>();
	const clones: ToolDefinition[] = sourceTools.map((tool) => {
		const newId = createId();
		idMap.set(tool.id, newId);
		return {
			...tool,
			id: newId,
			agent_id: targetAgentId,
			config: structuredClone(tool.config),
			parameters_schema: structuredClone(tool.parameters_schema),
		};
	});

	await writeTools(organizationId, [...allTools, ...clones]);
	return idMap;
}

/**
 * Fix agents duplicated before tool cloning existed: config still points at
 * another agent's tools. Clone those source tools onto this agent and remap
 * draft config IDs. Returns tools owned by `agentId` after repair.
 */
export async function repairSharedOrgToolsForAgent(params: {
	organizationId: string;
	agentId: string;
	draftConfig: Record<string, unknown>;
	createId: () => string;
	persistConfig: (
		config: Record<string, unknown>,
	) => Promise<void>;
}): Promise<ToolDefinition[]> {
	const { organizationId, agentId, draftConfig, createId, persistConfig } =
		params;

	const owned = await listOrgTools(organizationId, { agentId });
	const referencedIds = collectAllConfigToolIds(draftConfig);
	if (referencedIds.length === 0) {
		return owned;
	}

	const allTools = await listOrgTools(organizationId);
	const byId = new Map(allTools.map((tool) => [tool.id, tool]));
	const foreignSourceIds = new Set<string>();
	for (const id of referencedIds) {
		const tool = byId.get(id);
		if (tool && tool.agent_id !== agentId) {
			foreignSourceIds.add(tool.agent_id);
		}
	}
	if (foreignSourceIds.size === 0) {
		return owned;
	}

	const idMap = new Map<string, string>();
	const clones: ToolDefinition[] = [];
	for (const sourceAgentId of foreignSourceIds) {
		for (const tool of allTools) {
			if (tool.agent_id !== sourceAgentId) {
				continue;
			}
			const newId = createId();
			idMap.set(tool.id, newId);
			clones.push({
				...tool,
				id: newId,
				agent_id: agentId,
				config: structuredClone(tool.config),
				parameters_schema: structuredClone(tool.parameters_schema),
			});
		}
	}

	if (clones.length === 0) {
		return owned;
	}

	await writeTools(organizationId, [...allTools, ...clones]);
	await persistConfig(remapToolIdsInConfig(draftConfig, idMap));
	return listOrgTools(organizationId, { agentId });
}

export type { OrgMetadata };
export { parseMetadata };

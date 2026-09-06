"use client";

import { DataCollectionFieldsEditor } from "@/components/saas/agents/configure/DataCollectionFieldsEditor";
import { McpServersEditor } from "@/components/saas/agents/configure/McpServersEditor";
import { VariablesEditor } from "@/components/saas/agents/configure/VariablesEditor";
import { ConfigureSectionToggle } from "@/components/saas/agents/configure/ConfigureSectionToggle";
import { KeyValueEditor } from "@/components/saas/agents/KeyValueEditor";
import type { AgentConfigDocument } from "@/lib/agent-config";

type AdvancedSectionProps = {
	config: AgentConfigDocument;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
	versionId?: string;
};

function SectionHeader({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div>
			<h3 className="text-sm font-semibold">{title}</h3>
			<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
		</div>
	);
}

export function AdvancedSection({ config, onConfigChange, versionId }: AdvancedSectionProps) {
	return (
		<div className="divide-y rounded-xl border bg-card">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Secrets"
					description="Secure values injected into the agent runtime. Reference them as {{secret_name}} in prompts and tool headers."
				/>
				<KeyValueEditor
					values={config.environment_variables}
					onChange={(environment_variables) =>
						onConfigChange({ environment_variables })
					}
					keyPlaceholder="SECRET_NAME"
					valuePlaceholder="Secret value"
					valueType="secret"
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Variables"
					description="Define variables available at runtime via {{variable_name}} in prompts and greetings. Values come from campaign dispatch metadata or debug preview."
				/>
				<VariablesEditor
					variables={config.variables}
					onChange={(variables) => onConfigChange({ variables })}
					versionId={versionId}
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Data collection fields"
					description="Structured fields the agent extracts during conversations. Results are sent to your call-ending endpoint when the session ends."
				/>
				<DataCollectionFieldsEditor
					fields={config.data_collection_fields}
					onChange={(data_collection_fields) =>
						onConfigChange({ data_collection_fields })
					}
					versionId={versionId}
				/>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="MCP servers"
					description="Connect external Model Context Protocol servers. The LLM automatically discovers and uses tools exposed by each server."
					checked={config.mcp.enabled}
					onCheckedChange={(enabled) =>
						onConfigChange({ mcp: { ...config.mcp, enabled } })
					}
				>
					<McpServersEditor
						mcp={config.mcp}
						onChange={(mcp) => onConfigChange({ mcp })}
					/>
				</ConfigureSectionToggle>
			</div>
		</div>
	);
}

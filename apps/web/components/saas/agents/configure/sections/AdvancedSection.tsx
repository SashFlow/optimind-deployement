"use client";

import { Button } from "@repo/ui/button";
import { PlusIcon } from "lucide-react";
import { type ReactNode, useRef } from "react";
import {
	DataCollectionFieldsEditor,
	type DataCollectionFieldsEditorHandle,
} from "@/components/saas/agents/configure/DataCollectionFieldsEditor";
import { McpServersEditor } from "@/components/saas/agents/configure/McpServersEditor";
import {
	VariablesEditor,
	type VariablesEditorHandle,
} from "@/components/saas/agents/configure/VariablesEditor";
import { ConfigureSectionToggle } from "@/components/saas/agents/configure/ConfigureSectionToggle";
import {
	KeyValueEditor,
	type KeyValueEditorHandle,
} from "@/components/saas/agents/KeyValueEditor";
import type { AgentConfigDocument } from "@/lib/agent-config";

type AdvancedSectionProps = {
	config: AgentConfigDocument;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
	versionId?: string;
};

function SectionHeader({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<h3 className="text-sm font-semibold">{title}</h3>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{description}
				</p>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}

export function AdvancedSection({
	config,
	onConfigChange,
	versionId,
}: AdvancedSectionProps) {
	const secretsRef = useRef<KeyValueEditorHandle>(null);
	const variablesRef = useRef<VariablesEditorHandle>(null);
	const fieldsRef = useRef<DataCollectionFieldsEditorHandle>(null);

	return (
		<div className="divide-y rounded-xl border bg-card">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Secrets"
					description="Secure values injected into the agent runtime. Reference them as {{secret_name}} in prompts and tool headers."
					action={
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => secretsRef.current?.add()}
						>
							<PlusIcon />
							Add
						</Button>
					}
				/>
				<KeyValueEditor
					ref={secretsRef}
					values={config.environment_variables}
					onChange={(environment_variables) =>
						onConfigChange({ environment_variables })
					}
					keyPlaceholder="SECRET_NAME"
					valuePlaceholder="Secret value"
					valueType="secret"
					hideAddButton
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Variables"
					description="Define variables available at runtime via {{variable_name}} in prompts and greetings. Values come from campaign dispatch metadata or debug preview."
					action={
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => variablesRef.current?.add()}
						>
							<PlusIcon />
							Add variable
						</Button>
					}
				/>
				<VariablesEditor
					ref={variablesRef}
					variables={config.variables}
					onChange={(variables) => onConfigChange({ variables })}
					versionId={versionId}
					hideAddButton
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Data collection fields"
					description="Structured fields the agent extracts during conversations. Results are sent to your call-ending endpoint when the session ends."
					action={
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => fieldsRef.current?.add()}
						>
							<PlusIcon />
							Add field
						</Button>
					}
				/>
				<DataCollectionFieldsEditor
					ref={fieldsRef}
					fields={config.data_collection_fields}
					onChange={(data_collection_fields) =>
						onConfigChange({ data_collection_fields })
					}
					versionId={versionId}
					hideAddButton
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

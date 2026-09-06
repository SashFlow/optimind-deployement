"use client";

import { ToolsPhasePanel } from "@/components/saas/agents/configure/ToolsPhasePanel";
import type { AgentConfigDocument } from "@/lib/agent-config";
import type { ToolDefinition } from "@/services/api/types";

type ToolsSectionProps = {
	config: AgentConfigDocument;
	orgTools: ToolDefinition[];
	organizationId: string;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
};

export function ToolsSection({
	config,
	orgTools,
	organizationId,
	onConfigChange,
}: ToolsSectionProps) {
	return (
		<ToolsPhasePanel
			config={config}
			orgTools={orgTools}
			organizationId={organizationId}
			onConfigChange={onConfigChange}
		/>
	);
}

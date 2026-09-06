"use client";

import { Switch } from "@repo/ui/switch";
import { ConfigureMarkdownEditor } from "@/components/saas/agents/configure/ConfigureMarkdownEditor";
import type {
	AgentConfigDocument,
	AgentVariableDefinition,
} from "@/lib/agent-config";

type CallEndingFieldsProps = {
	callEnding: AgentConfigDocument["call_ending"];
	onChange: (callEnding: AgentConfigDocument["call_ending"]) => void;
	variables?: AgentVariableDefinition[];
	environmentVariables?: Record<string, string>;
};

export function CallEndingFields({
	callEnding,
	onChange,
	variables = [],
	environmentVariables = {},
}: CallEndingFieldsProps) {
	return (
		<div className="space-y-4">
			<label className="flex items-center gap-2 text-sm">
				<Switch
					checked={callEnding.enabled}
					onCheckedChange={(enabled) =>
						onChange({ ...callEnding, enabled })
					}
				/>
				Enabled
			</label>
			<ConfigureMarkdownEditor
				value={callEnding.farewell_message}
				onChange={(farewell_message) =>
					onChange({ ...callEnding, farewell_message })
				}
				placeholder="Farewell message"
				minHeight="80px"
				variables={variables}
				environmentVariables={environmentVariables}
			/>
		</div>
	);
}

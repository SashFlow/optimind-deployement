"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useStableRowIds } from "@/components/saas/agents/configure/useStableRowIds";
import type { AgentVariableDefinition } from "@/lib/agent-config";

const VARIABLE_TYPE_OPTIONS: {
	value: AgentVariableDefinition["variable_type"];
	label: string;
}[] = [
	{ value: "text", label: "Text" },
	{ value: "number", label: "Number" },
	{ value: "link", label: "Link" },
	{ value: "file", label: "File" },
];

function createEmptyVariable(): AgentVariableDefinition {
	return {
		name: "",
		variable_type: "text",
		required: false,
	};
}

type VariablesEditorProps = {
	variables: AgentVariableDefinition[];
	onChange: (variables: AgentVariableDefinition[]) => void;
	versionId?: string;
};

export function VariablesEditor({
	variables,
	onChange,
	versionId,
}: VariablesEditorProps) {
	const { rowIds, appendRowId, removeRowId } = useStableRowIds(
		variables.length,
		versionId,
	);

	function updateVariable(
		index: number,
		patch: Partial<AgentVariableDefinition>,
	) {
		onChange(
			variables.map((variable, i) =>
				i === index ? { ...variable, ...patch } : variable,
			),
		);
	}

	function addVariable() {
		appendRowId();
		onChange([...variables, createEmptyVariable()]);
	}

	function removeVariable(index: number) {
		removeRowId(index);
		onChange(variables.filter((_, i) => i !== index));
	}

	if (variables.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-6 text-center">
				<p className="text-sm font-medium">No variables yet</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Define variables available at runtime via{" "}
					{"{{variable_name}}"} in prompts.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={addVariable}
				>
					<PlusIcon />
					Add variable
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="overflow-hidden rounded-lg border bg-background">
				<div className="hidden gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_7rem_5.5rem_2rem]">
					<span>Name</span>
					<span>Type</span>
					<span>Optional</span>
					<span className="sr-only">Remove</span>
				</div>
				<div className="divide-y">
					{variables.map((variable, index) => (
						<div
							key={rowIds[index] ?? index}
							className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_7rem_5.5rem_2rem] sm:items-center"
						>
							<Input
								value={variable.name}
								onChange={(e) =>
									updateVariable(index, {
										name: e.target.value,
									})
								}
								placeholder="variable_name"
								className="h-8 bg-background text-sm"
								aria-label="Variable name"
							/>
							<Select
								value={variable.variable_type}
								onValueChange={(value) =>
									value &&
									updateVariable(index, {
										variable_type:
											value as AgentVariableDefinition["variable_type"],
									})
								}
								items={VARIABLE_TYPE_OPTIONS}
							>
								<SelectTrigger className="h-8 w-full bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VARIABLE_TYPE_OPTIONS.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<label className="flex items-center justify-center gap-2 text-xs sm:justify-start">
								<Switch
									checked={!variable.required}
									onCheckedChange={(optional) =>
										updateVariable(index, {
											required: !optional,
										})
									}
									aria-label="Optional"
								/>
								<span className="text-muted-foreground sm:hidden">
									Optional
								</span>
							</label>
							<div className="flex items-center justify-end">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeVariable(index)}
									aria-label="Remove variable"
									className="text-muted-foreground"
								>
									<Trash2Icon />
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addVariable}
			>
				<PlusIcon />
				Add variable
			</Button>
		</div>
	);
}

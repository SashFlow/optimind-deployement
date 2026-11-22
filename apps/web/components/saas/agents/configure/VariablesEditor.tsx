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
import { forwardRef, useImperativeHandle } from "react";
import { useStableRowIds } from "@/components/saas/agents/configure/useStableRowIds";
import type {
	AgentVariableDefaultValue,
	AgentVariableDefinition,
} from "@/lib/agent-config";

const VARIABLE_TYPE_OPTIONS: {
	value: AgentVariableDefinition["variable_type"];
	label: string;
}[] = [
	{ value: "text", label: "Text" },
	{ value: "number", label: "Number" },
	{ value: "link", label: "Link" },
	{ value: "file", label: "File" },
];

function createEmptyDefaultValue(): AgentVariableDefaultValue {
	return { label: "", value: "" };
}

function createEmptyVariable(): AgentVariableDefinition {
	return {
		name: "",
		variable_type: "text",
		required: false,
		default_values: [],
	};
}

type VariablesEditorProps = {
	variables: AgentVariableDefinition[];
	onChange: (variables: AgentVariableDefinition[]) => void;
	versionId?: string;
	hideAddButton?: boolean;
};

export type VariablesEditorHandle = {
	add: () => void;
};

export const VariablesEditor = forwardRef<
	VariablesEditorHandle,
	VariablesEditorProps
>(function VariablesEditor(
	{ variables, onChange, versionId, hideAddButton = false },
	ref,
) {
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

	function defaultsFor(variable: AgentVariableDefinition) {
		return variable.default_values ?? [];
	}

	function updateDefaultValue(
		variableIndex: number,
		defaultIndex: number,
		patch: Partial<AgentVariableDefaultValue>,
	) {
		const variable = variables[variableIndex];
		if (!variable) {
			return;
		}
		updateVariable(variableIndex, {
			default_values: defaultsFor(variable).map((entry, i) =>
				i === defaultIndex ? { ...entry, ...patch } : entry,
			),
		});
	}

	function addDefaultValue(variableIndex: number) {
		const variable = variables[variableIndex];
		if (!variable) {
			return;
		}
		updateVariable(variableIndex, {
			default_values: [
				...defaultsFor(variable),
				createEmptyDefaultValue(),
			],
		});
	}

	function removeDefaultValue(variableIndex: number, defaultIndex: number) {
		const variable = variables[variableIndex];
		if (!variable) {
			return;
		}
		updateVariable(variableIndex, {
			default_values: defaultsFor(variable).filter(
				(_, i) => i !== defaultIndex,
			),
		});
	}

	function addVariable() {
		appendRowId();
		onChange([...variables, createEmptyVariable()]);
	}

	function removeVariable(index: number) {
		removeRowId(index);
		onChange(variables.filter((_, i) => i !== index));
	}

	useImperativeHandle(ref, () => ({ add: addVariable }));

	if (variables.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-6 text-center">
				<p className="text-sm font-medium">No variables yet</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Define variables available at runtime via{" "}
					{"{{variable_name}}"} in prompts.
				</p>
				{hideAddButton ? null : (
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
				)}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="overflow-hidden rounded-lg border bg-background divide-y">
				{variables.map((variable, index) => (
					<div
						key={rowIds[index] ?? index}
						className="space-y-2 px-3 py-2"
					>
						<div className="grid gap-2 sm:grid-cols-[1fr_7rem_5.5rem_2rem] sm:items-center">
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
							<div className="flex items-center justify-center gap-2 text-xs sm:justify-start">
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
							</div>
							<div className="flex items-center justify-end">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeVariable(index)}
									aria-label="Remove variable"
									className="text-muted-foreground"
								>
									<Trash2Icon />
								</Button>
							</div>
						</div>

						<div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-2">
							<div className="flex items-center justify-between gap-2">
								<p className="text-xs font-medium text-muted-foreground">
									Default values
								</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={() => addDefaultValue(index)}
								>
									<PlusIcon className="size-3.5" />
									Add
								</Button>
							</div>
							{defaultsFor(variable).length === 0 ? (
								<p className="text-xs text-muted-foreground">
									Optional. Preview users can pick these or
									type their own.
								</p>
							) : (
								<div className="space-y-1.5">
									{defaultsFor(variable).map(
										(entry, defaultIndex) => (
											<div
												key={`${rowIds[index]}-default-${defaultIndex}`}
												className="grid gap-2 sm:grid-cols-[1fr_1fr_2rem] sm:items-center"
											>
												<Input
													value={entry.label}
													onChange={(e) =>
														updateDefaultValue(
															index,
															defaultIndex,
															{
																label: e.target
																	.value,
															},
														)
													}
													placeholder="Label"
													className="h-8 bg-background text-sm"
													aria-label="Default value label"
												/>
												<Input
													value={entry.value}
													onChange={(e) =>
														updateDefaultValue(
															index,
															defaultIndex,
															{
																value: e.target
																	.value,
															},
														)
													}
													placeholder="Value"
													className="h-8 bg-background text-sm"
													aria-label="Default value"
												/>
												<div className="flex items-center justify-end">
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() =>
															removeDefaultValue(
																index,
																defaultIndex,
															)
														}
														aria-label="Remove default value"
														className="text-muted-foreground"
													>
														<Trash2Icon />
													</Button>
												</div>
											</div>
										),
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{hideAddButton ? null : (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addVariable}
				>
					<PlusIcon />
					Add variable
				</Button>
			)}
		</div>
	);
});

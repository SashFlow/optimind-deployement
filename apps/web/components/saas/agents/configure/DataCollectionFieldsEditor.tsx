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
import type { DataCollectionField } from "@/lib/agent-config";

const FIELD_TYPE_OPTIONS: {
	value: DataCollectionField["field_type"];
	label: string;
}[] = [
		{ value: "string", label: "String" },
		{ value: "number", label: "Number" },
		{ value: "boolean", label: "Boolean" },
		{ value: "enum", label: "Enum" },
	];

function createEmptyField(): DataCollectionField {
	return {
		key: "",
		label: "",
		description: "",
		field_type: "string",
		required: false,
		options: [],
	};
}

type DataCollectionFieldsEditorProps = {
	fields: DataCollectionField[];
	onChange: (fields: DataCollectionField[]) => void;
	versionId?: string;
};

export function DataCollectionFieldsEditor({
	fields,
	onChange,
	versionId,
}: DataCollectionFieldsEditorProps) {
	const { rowIds, appendRowId, removeRowId } = useStableRowIds(
		fields.length,
		versionId,
	);

	function updateField(index: number, patch: Partial<DataCollectionField>) {
		onChange(
			fields.map((field, i) =>
				i === index ? { ...field, ...patch } : field,
			),
		);
	}

	function addField() {
		appendRowId();
		onChange([...fields, createEmptyField()]);
	}

	function removeField(index: number) {
		removeRowId(index);
		onChange(fields.filter((_, i) => i !== index));
	}

	if (fields.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-6 text-center">
				<p className="text-sm font-medium">No fields yet</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Add fields the agent should extract during each call.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={addField}
				>
					<PlusIcon />
					Add field
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="overflow-hidden rounded-lg border bg-background divide-y">
				{fields.map((field, index) => (
					<div
						key={rowIds[index] ?? index}
						className="space-y-2 px-3 py-2"
					>
						<div className="grid gap-2 sm:grid-cols-[1fr_1fr_6.5rem_5rem_2rem] sm:items-center">
							<Input
								value={field.key}
								onChange={(e) =>
									updateField(index, { key: e.target.value })
								}
								placeholder="key"
								className="h-8 bg-background text-sm"
								aria-label="Field key"
							/>
							<Input
								value={field.label}
								onChange={(e) =>
									updateField(index, {
										label: e.target.value,
									})
								}
								placeholder="Label"
								className="h-8 bg-background text-sm"
								aria-label="Field label"
							/>
							<Select
								value={field.field_type}
								onValueChange={(value) =>
									value &&
									updateField(index, {
										field_type:
											value as DataCollectionField["field_type"],
										options:
											value === "enum"
												? field.options
												: [],
									})
								}
								items={FIELD_TYPE_OPTIONS}
							>
								<SelectTrigger className="h-8 w-full bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FIELD_TYPE_OPTIONS.map((option) => (
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
									checked={field.required}
									onCheckedChange={(required) =>
										updateField(index, { required })
									}
									aria-label="Required"
								/>
							</label>
							<div className="flex items-center justify-end">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeField(index)}
									aria-label="Remove field"
									className="text-muted-foreground"
								>
									<Trash2Icon />
								</Button>
							</div>
						</div>
						<Input
							value={field.description}
							onChange={(e) =>
								updateField(index, {
									description: e.target.value,
								})
							}
							placeholder="Description for LLM extraction"
							className="h-8 bg-background text-sm"
							aria-label="Field description"
						/>
						{field.field_type === "enum" ? (
							<Input
								value={field.options.join(", ")}
								onChange={(e) =>
									updateField(index, {
										options: e.target.value
											.split(",")
											.map((option) => option.trim())
											.filter(Boolean),
									})
								}
								placeholder="Options: option_a, option_b"
								className="h-8 bg-background text-sm"
								aria-label="Enum options"
							/>
						) : null}
					</div>
				))}
			</div>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addField}
			>
				<PlusIcon />
				Add field
			</Button>
		</div>
	);
}

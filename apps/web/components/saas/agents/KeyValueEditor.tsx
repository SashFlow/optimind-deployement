"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/utils";
import { EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

type KeyValueRow = {
	id: string;
	key: string;
	value: string;
};

function createRow(key = "", value = ""): KeyValueRow {
	return { id: crypto.randomUUID(), key, value };
}

function valuesToRows(values: Record<string, string>): KeyValueRow[] {
	const entries = Object.entries(values);
	if (entries.length === 0) return [createRow()];
	return entries.map(([key, value]) => createRow(key, value));
}

function rowsToValues(rows: KeyValueRow[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const row of rows) {
		const trimmedKey = row.key.trim();
		if (trimmedKey) {
			result[trimmedKey] = row.value;
		}
	}
	return result;
}

export function KeyValueEditor({
	label,
	values,
	onChange,
	keyPlaceholder = "Key",
	valuePlaceholder = "Value",
	valueType = "text",
	hint,
}: {
	label?: string;
	values: Record<string, string>;
	onChange: (values: Record<string, string>) => void;
	keyPlaceholder?: string;
	valuePlaceholder?: string;
	valueType?: "text" | "secret";
	hint?: string;
}) {
	const [rows, setRows] = useState<KeyValueRow[]>(() => valuesToRows(values));
	const [showSecrets, setShowSecrets] = useState(false);

	function commitRows(nextRows: KeyValueRow[]) {
		const normalized = nextRows.length > 0 ? nextRows : [createRow()];
		setRows(normalized);
		onChange(rowsToValues(normalized));
	}

	function updateEntry(index: number, field: "key" | "value", next: string) {
		const nextRows = rows.map((row, i) =>
			i === index ? { ...row, [field]: next } : row,
		);
		commitRows(nextRows);
	}

	function addEntry() {
		commitRows([...rows, createRow()]);
	}

	function removeEntry(index: number) {
		const nextRows = rows.filter((_, i) => i !== index);
		commitRows(nextRows);
	}

	return (
		<div className="space-y-3">
			{(label || valueType === "secret") && (
				<div className="flex items-center justify-between gap-2">
					{label ? (
						<p className="text-xs font-medium text-muted-foreground">
							{label}
						</p>
					) : (
						<div />
					)}
					{valueType === "secret" ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
							onClick={() =>
								setShowSecrets((current) => !current)
							}
						>
							{showSecrets ? (
								<EyeOffIcon className="size-3.5" />
							) : (
								<EyeIcon className="size-3.5" />
							)}
							{showSecrets ? "Hide values" : "Show values"}
						</Button>
					) : null}
				</div>
			)}
			<div className="space-y-2">
				{rows.map((row, index) => (
					<div key={row.id} className="flex items-center gap-2">
						<Input
							value={row.key}
							onChange={(e) =>
								updateEntry(index, "key", e.target.value)
							}
							placeholder={keyPlaceholder}
							className="h-9 bg-background text-sm"
						/>
						<Input
							value={row.value}
							onChange={(e) =>
								updateEntry(index, "value", e.target.value)
							}
							placeholder={valuePlaceholder}
							type={
								valueType === "secret" && !showSecrets
									? "password"
									: "text"
							}
							className="h-9 bg-background text-sm"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => removeEntry(index)}
							aria-label="Remove entry"
							className="shrink-0 text-muted-foreground"
						>
							<Trash2Icon />
						</Button>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addEntry}
			>
				<PlusIcon />
				Add
			</Button>
			{hint ? (
				<p className={cn("text-xs text-muted-foreground")}>{hint}</p>
			) : null}
		</div>
	);
}

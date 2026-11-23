"use client";

import { Input } from "@repo/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";
import * as React from "react";
import type {
	AgentVariableDefaultValue,
	AgentVariableDefinition,
} from "@/lib/agent-config";

const CUSTOM_VALUE = "__custom__";

function usableDefaults(
	defaults: AgentVariableDefaultValue[] | undefined,
): AgentVariableDefaultValue[] {
	if (!defaults?.length) {
		return [];
	}
	const seen = new Set<string>();
	const result: AgentVariableDefaultValue[] = [];
	for (const entry of defaults) {
		const value = entry.value.trim();
		if (!value || seen.has(value)) {
			continue;
		}
		seen.add(value);
		result.push({
			label: entry.label.trim() || entry.value,
			value: entry.value,
		});
	}
	return result;
}

type VariableValueInputProps = {
	id?: string;
	variable: AgentVariableDefinition;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	/** Extra controls shown with the freeform input (e.g. file upload). */
	freeformAddon?: React.ReactNode;
};

/**
 * Renders a plain input, or a select of default values plus a "Custom" option
 * that reveals the freeform input when defaults are configured.
 */
export function VariableValueInput({
	id,
	variable,
	value,
	onChange,
	placeholder,
	className,
	freeformAddon,
}: VariableValueInputProps) {
	const defaults = usableDefaults(variable.default_values);
	const matched = defaults.find((entry) => entry.value === value);
	const valueIsCustom = Boolean(value) && !matched;
	const [customMode, setCustomMode] = React.useState(valueIsCustom);
	const [customDraft, setCustomDraft] = React.useState(
		valueIsCustom ? value : "",
	);

	React.useEffect(() => {
		if (valueIsCustom) {
			setCustomMode(true);
			setCustomDraft(value);
			return;
		}
		if (matched) {
			setCustomMode(false);
		}
	}, [matched, value, valueIsCustom]);

	const inputType =
		variable.variable_type === "number"
			? "number"
			: variable.variable_type === "link" ||
					variable.variable_type === "file"
				? "url"
				: "text";

	const resolvedPlaceholder =
		placeholder ??
		(variable.variable_type === "file"
			? "Paste file URL"
			: variable.variable_type === "link"
				? "https://"
				: variable.required
					? "Required"
					: "Optional");

	const showCustomInput =
		defaults.length === 0 || customMode || valueIsCustom;

	const freeformInput = (
		<Input
			id={defaults.length === 0 || showCustomInput ? id : undefined}
			type={inputType}
			value={defaults.length > 0 && showCustomInput ? customDraft : value}
			onChange={(e) => {
				const next = e.target.value;
				if (defaults.length > 0) {
					setCustomDraft(next);
				}
				onChange(next);
			}}
			placeholder={resolvedPlaceholder}
			className={className}
		/>
	);

	if (defaults.length === 0) {
		return (
			<div className="space-y-2 scroll-mt-24 scroll-mb-28">
				{freeformInput}
				{freeformAddon}
			</div>
		);
	}

	const selectValue = showCustomInput
		? CUSTOM_VALUE
		: value
			? value
			: undefined;

	return (
		<div className="space-y-2 scroll-mt-24 scroll-mb-28">
			{/* Hide the select on narrow screens while typing a custom value — avoids stacked crowding with the keyboard open */}
			<div className={cn(showCustomInput && "hidden sm:block")}>
				<Select
					value={selectValue}
					onValueChange={(next) => {
						if (!next) {
							return;
						}
						if (next === CUSTOM_VALUE) {
							setCustomMode(true);
							onChange(customDraft);
							return;
						}
						setCustomMode(false);
						setCustomDraft("");
						onChange(next);
					}}
				>
					<SelectTrigger
						id={showCustomInput ? undefined : id}
						className={className ?? "w-full"}
					>
						<SelectValue placeholder="Select a value" />
					</SelectTrigger>
					<SelectContent>
						{defaults.map((entry) => (
							<SelectItem key={entry.value} value={entry.value}>
								{entry.label}
							</SelectItem>
						))}
						<SelectItem value={CUSTOM_VALUE}>
							Custom value
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{showCustomInput ? (
				<>
					{freeformInput}
					{freeformAddon}
					<button
						type="button"
						className="text-muted-foreground text-xs underline-offset-2 hover:underline sm:hidden"
						onClick={() => {
							setCustomMode(false);
							setCustomDraft("");
							onChange(matched?.value ?? "");
						}}
					>
						Choose from list
					</button>
				</>
			) : null}
		</div>
	);
}

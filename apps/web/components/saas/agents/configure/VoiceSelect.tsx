"use client";

import { Input } from "@repo/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import * as React from "react";
import type { ProviderVoice } from "@/services/api/types";

const CUSTOM_VALUE = "__custom__";

type VoiceSelectProps = {
	voices: ProviderVoice[];
	value: string | null | undefined;
	onValueChange: (voiceId: string) => void;
	disabled?: boolean;
	placeholder?: string;
	disabledPlaceholder?: string;
};

export function VoiceSelect({
	voices,
	value,
	onValueChange,
	disabled = false,
	placeholder = "Select voice",
	disabledPlaceholder = "Select a model first",
}: VoiceSelectProps) {
	const matched = voices.find((voice) => voice.voice_id === value);
	const valueIsCustom = Boolean(value) && !matched;
	const [customMode, setCustomMode] = React.useState(valueIsCustom);
	const [customDraft, setCustomDraft] = React.useState(
		valueIsCustom ? (value ?? "") : "",
	);

	React.useEffect(() => {
		if (valueIsCustom) {
			setCustomMode(true);
			setCustomDraft(value ?? "");
			return;
		}
		if (matched) {
			setCustomMode(false);
		}
	}, [matched, value, valueIsCustom]);

	const showCustomInput = customMode || valueIsCustom;
	const selectValue = showCustomInput ? CUSTOM_VALUE : (value ?? "");

	return (
		<div className="space-y-2">
			<Select
				value={selectValue}
				onValueChange={(next) => {
					if (!next) {
						return;
					}
					if (next === CUSTOM_VALUE) {
						setCustomMode(true);
						onValueChange(customDraft);
						return;
					}
					setCustomMode(false);
					setCustomDraft("");
					onValueChange(next);
				}}
				disabled={disabled}
			>
				<SelectTrigger className="w-full bg-background">
					<SelectValue
						placeholder={
							disabled ? disabledPlaceholder : placeholder
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{voices.map((voice) => (
						<SelectItem key={voice.id} value={voice.voice_id}>
							{voice.label}
						</SelectItem>
					))}
					<SelectItem value={CUSTOM_VALUE}>
						Custom voice ID
					</SelectItem>
				</SelectContent>
			</Select>
			{showCustomInput ? (
				<Input
					className="bg-background"
					value={customDraft}
					onChange={(e) => {
						setCustomDraft(e.target.value);
						onValueChange(e.target.value);
					}}
					placeholder="Enter provider voice ID"
					disabled={disabled}
					autoFocus
				/>
			) : null}
		</div>
	);
}

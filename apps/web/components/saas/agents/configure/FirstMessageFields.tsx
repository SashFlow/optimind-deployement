"use client";

import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import type { AgentConfigDocument } from "@/lib/agent-config";

const GREETING_TRIGGER_OPTIONS = [
	{ value: "on_join", label: "On join" },
	{ value: "on_first_speech", label: "On first speech" },
	{ value: "manual", label: "Manual" },
] as const;

type FirstMessageFieldsProps = {
	greeting: AgentConfigDocument["greeting"];
	onChange: (greeting: AgentConfigDocument["greeting"]) => void;
};

export function FirstMessageFields({
	greeting,
	onChange,
}: FirstMessageFieldsProps) {
	return (
		<div className="space-y-4">
			<label className="flex items-center gap-2 text-sm">
				<Switch
					checked={greeting.enabled}
					onCheckedChange={(enabled) =>
						onChange({ ...greeting, enabled })
					}
				/>
				Enabled
			</label>
			<Textarea
				value={greeting.text}
				onChange={(e) =>
					onChange({ ...greeting, text: e.target.value })
				}
				placeholder="Write your greeting message..."
				rows={4}
				className="min-h-24 bg-background text-sm"
			/>
			<div className="space-y-2">
				<Label className="text-sm font-medium">Trigger</Label>
				<Select
					value={greeting.trigger}
					onValueChange={(value) =>
						value &&
						onChange({
							...greeting,
							trigger:
								value as AgentConfigDocument["greeting"]["trigger"],
						})
					}
					items={[...GREETING_TRIGGER_OPTIONS]}
				>
					<SelectTrigger className="w-full bg-background sm:max-w-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GREETING_TRIGGER_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

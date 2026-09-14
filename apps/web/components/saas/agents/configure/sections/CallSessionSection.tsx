"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
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
import { BellOffIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { ConfigureRadioCard } from "@/components/saas/agents/configure/ConfigureRadioCard";
import { LocaleCombobox } from "@/components/saas/agents/configure/LocaleCombobox";
import type { AgentConfigDocument } from "@/lib/agent-config";
import { AVATAR_MAX_DURATION_SECONDS } from "@/lib/agent-pipeline";
import { useTimezonesQuery } from "@/services/api/hooks";

const DURATION_OPTIONS = [
	{ value: "240", label: "4 minutes" },
	{ value: "300", label: "5 minutes" },
	{ value: "480", label: "8 minutes" },
	{ value: "600", label: "10 minutes" },
];

const INACTIVITY_OPTIONS = [
	{ value: "5", label: "5 seconds" },
	{ value: "10", label: "10 seconds" },
	{ value: "20", label: "20 seconds" },
	{ value: "30", label: "30 seconds" },
];

type CallSessionSectionProps = {
	config: AgentConfigDocument;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
};

function SectionHeader({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div>
			<h3 className="text-sm font-semibold">{title}</h3>
			<p className="mt-0.5 text-xs text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function ToggleField({
	label,
	description,
	checked,
	onCheckedChange,
	children,
}: {
	label: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children?: React.ReactNode;
}) {
	return (
		<div className="space-y-3 border-b py-3 last:border-b-0">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">{label}</p>
					{description ? (
						<p className="mt-0.5 text-xs text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
				<Switch
					checked={checked}
					onCheckedChange={onCheckedChange}
					aria-label={label}
				/>
			</div>
			{checked && children ? children : null}
		</div>
	);
}

export function CallSessionSection({
	config,
	onConfigChange,
}: CallSessionSectionProps) {
	const [keywordInput, setKeywordInput] = React.useState("");
	const timezonesQuery = useTimezonesQuery();
	const avatarEnabled = config.avatar?.enabled ?? false;
	const durationOptions = avatarEnabled
		? DURATION_OPTIONS.filter(
				(opt) => Number(opt.value) <= AVATAR_MAX_DURATION_SECONDS,
			)
		: DURATION_OPTIONS;

	const maxDuration = String(
		avatarEnabled
			? Math.min(
					config.call_ending.max_duration_seconds ??
						AVATAR_MAX_DURATION_SECONDS,
					AVATAR_MAX_DURATION_SECONDS,
				)
			: (config.call_ending.max_duration_seconds ?? "480"),
	);

	React.useEffect(() => {
		if (!avatarEnabled) {
			return;
		}
		const current = config.call_ending.max_duration_seconds;
		if (
			current == null ||
			current > AVATAR_MAX_DURATION_SECONDS
		) {
			onConfigChange({
				call_ending: {
					...config.call_ending,
					max_duration_seconds: AVATAR_MAX_DURATION_SECONDS,
				},
			});
		}
	}, [avatarEnabled, config.call_ending.max_duration_seconds]);
	const inactivityWarning = String(
		config.call_ending.inactivity_warning_seconds ?? "20",
	);
	const inactivityEnd = String(
		config.call_ending.inactivity_end_seconds ?? "25",
	);

	function addKeywords() {
		const newKeywords = keywordInput
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);
		if (newKeywords.length === 0) {
			return;
		}
		onConfigChange({
			keyword_boosting: {
				keywords: [
					...new Set([
						...config.keyword_boosting.keywords,
						...newKeywords,
					]),
				],
			},
		});
		setKeywordInput("");
	}

	return (
		<div className="rounded-xl border bg-card divide-y">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Call duration"
					description="Limits and inactivity timeouts for active calls."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Maximum call duration
						</Label>
						<Select
							value={maxDuration}
							onValueChange={(value) =>
								value &&
								onConfigChange({
									call_ending: {
										...config.call_ending,
										max_duration_seconds: Number(value),
									},
								})
							}
						>
							<SelectTrigger className="w-full bg-background">
								<ClockIcon className="size-4 text-muted-foreground" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{durationOptions.map((opt) => (
									<SelectItem
										key={opt.value}
										value={opt.value}
									>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{avatarEnabled ? (
							<p className="text-xs text-muted-foreground">
								Limited to 5 minutes while avatar is enabled.
							</p>
						) : null}
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-medium">Timezone</Label>
						<LocaleCombobox
							options={timezonesQuery.data ?? []}
							value={config.call_ending.timezone}
							onChange={(timezone) =>
								timezone &&
								onConfigChange({
									call_ending: {
										...config.call_ending,
										timezone,
									},
								})
							}
							placeholder="Select timezone"
							isLoading={timezonesQuery.isLoading}
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Inactivity warning
						</Label>
						<Select
							value={inactivityWarning}
							onValueChange={(value) =>
								value &&
								onConfigChange({
									call_ending: {
										...config.call_ending,
										inactivity_warning_seconds:
											Number(value),
									},
								})
							}
						>
							<SelectTrigger className="w-full bg-background">
								<TriangleAlertIcon className="size-4 text-muted-foreground" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INACTIVITY_OPTIONS.map((opt) => (
									<SelectItem
										key={opt.value}
										value={opt.value}
									>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Inactivity duration
						</Label>
						<Select
							value={inactivityEnd}
							onValueChange={(value) =>
								value &&
								onConfigChange({
									call_ending: {
										...config.call_ending,
										inactivity_end_seconds: Number(value),
									},
								})
							}
						>
							<SelectTrigger className="w-full bg-background">
								<BellOffIcon className="size-4 text-muted-foreground" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INACTIVITY_OPTIONS.map((opt) => (
									<SelectItem
										key={opt.value}
										value={opt.value}
									>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Session recording"
					description="Record audio and video from sessions for playback in logs."
				/>
				<div className="rounded-lg border bg-background/60 px-3">
					<ToggleField
						label="Enable recording"
						description="Saves a composite recording when the session runs. Requires S3 egress to be configured."
						checked={config.recording_enabled}
						onCheckedChange={(recording_enabled) =>
							onConfigChange({ recording_enabled })
						}
					/>
				</div>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Voicemail"
					description="How the assistant handles calls that reach voicemail."
				/>
				<div className="rounded-lg border bg-background/60 px-3">
					<ToggleField
						label="Voicemail detection"
						description="Detects when a call reaches voicemail."
						checked={config.voicemail.detection_enabled}
						onCheckedChange={(detection_enabled) =>
							onConfigChange({
								voicemail: {
									...config.voicemail,
									detection_enabled,
								},
							})
						}
					/>
					<ToggleField
						label="Leave voicemail message"
						description="When enabled, provide the message the assistant should leave."
						checked={config.voicemail.leave_message_enabled}
						onCheckedChange={(leave_message_enabled) =>
							onConfigChange({
								voicemail: {
									...config.voicemail,
									leave_message_enabled,
								},
							})
						}
					>
						<div className="space-y-1.5">
							<Label className="text-xs">Voicemail message</Label>
							<Textarea
								className="min-h-20 bg-background text-sm"
								value={config.voicemail.message}
								onChange={(e) =>
									onConfigChange({
										voicemail: {
											...config.voicemail,
											message: e.target.value,
										},
									})
								}
								placeholder="Message to leave on voicemail"
								rows={3}
								required
							/>
							{!config.voicemail.message.trim() ? (
								<p className="text-xs text-destructive">
									A message is required when this is enabled.
								</p>
							) : null}
						</div>
					</ToggleField>
					<ToggleField
						label="Retry call"
						description="Retries call if voicemail is detected."
						checked={config.voicemail.retry_call_enabled}
						onCheckedChange={(retry_call_enabled) =>
							onConfigChange({
								voicemail: {
									...config.voicemail,
									retry_call_enabled,
								},
							})
						}
					>
						<div className="space-y-1.5">
							<Label className="text-xs">
								Retry after (hours)
							</Label>
							<Input
								type="number"
								min={1}
								step={1}
								className="bg-background sm:max-w-xs"
								value={config.voicemail.retry_after_hours ?? ""}
								onChange={(e) => {
									const raw = e.target.value;
									const parsed =
										raw === "" ? null : Number(raw);
									onConfigChange({
										voicemail: {
											...config.voicemail,
											retry_after_hours:
												parsed != null &&
												Number.isFinite(parsed)
													? parsed
													: null,
										},
									});
								}}
								placeholder="e.g. 24"
								required
							/>
							{config.voicemail.retry_after_hours == null ||
							!Number.isFinite(
								config.voicemail.retry_after_hours,
							) ||
							config.voicemail.retry_after_hours <= 0 ? (
								<p className="text-xs text-destructive">
									retry_after_hours is required when this is
									enabled.
								</p>
							) : null}
						</div>
					</ToggleField>
				</div>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Interruption sensitivity"
					description="Controls how easily a caller can cut the assistant off while it is speaking."
				/>
				<ConfigureRadioCard
					value={config.interruption_sensitivity.mode}
					onChange={(mode) =>
						onConfigChange({
							interruption_sensitivity: {
								...config.interruption_sensitivity,
								mode,
							},
						})
					}
					options={[
						{
							value: "sensitive",
							label: "Sensitive",
							description:
								"Easiest to interrupt. The assistant yields as soon as the caller starts speaking.",
						},
						{
							value: "default",
							label: "Default",
							description:
								"Balanced. Short acknowledgements like 'hello' or 'hmm' don't cut the assistant off.",
						},
						{
							value: "strict",
							label: "Strict",
							description:
								"Hardest to interrupt. The caller has to keep speaking before the assistant stops.",
						},
					]}
				/>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Keyword boosting"
					description="Add targeted words to improve recognition and communication."
				/>
				<div className="flex gap-2">
					<Input
						className="bg-background"
						value={keywordInput}
						onChange={(e) => setKeywordInput(e.target.value)}
						placeholder="Add keywords, comma-separated..."
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addKeywords();
							}
						}}
					/>
					<Button type="button" onClick={addKeywords}>
						Add
					</Button>
				</div>
				{config.keyword_boosting.keywords.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{config.keyword_boosting.keywords.map((keyword) => (
							<span
								key={keyword}
								className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
							>
								{keyword}
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground"
									onClick={() =>
										onConfigChange({
											keyword_boosting: {
												keywords:
													config.keyword_boosting.keywords.filter(
														(k) => k !== keyword,
													),
											},
										})
									}
								>
									×
								</button>
							</span>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

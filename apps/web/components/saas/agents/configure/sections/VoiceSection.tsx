"use client";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Slider } from "@repo/ui/slider";
import { ConfigureRadioCard } from "@/components/saas/agents/configure/ConfigureRadioCard";
import { ConfigureSectionToggle } from "@/components/saas/agents/configure/ConfigureSectionToggle";
import { VoiceSpeedPicker } from "@/components/saas/agents/configure/VoiceSpeedPicker";
import type {
	AgentConfigDocument,
	AudioClipId,
	BackgroundAudioConfig,
	ToolCallAudioConfig,
} from "@/lib/agent-config";
import { useAudioClipsQuery } from "@/services/api/hooks";

type VoiceSectionProps = {
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

function AudioClipFields({
	value,
	onChange,
}: {
	value: BackgroundAudioConfig | ToolCallAudioConfig;
	onChange: (next: BackgroundAudioConfig | ToolCallAudioConfig) => void;
}) {
	const clipsQuery = useAudioClipsQuery();
	const clips = clipsQuery.data ?? [
		{
			id: "office_ambience" as const,
			label: "Office ambience",
			description: "Busy office chatter and background noise.",
			builtin: true,
		},
		{
			id: "keyboard_typing" as const,
			label: "Keyboard typing",
			description: "Close-mic keyboard typing.",
			builtin: true,
		},
		{
			id: "keyboard_typing2" as const,
			label: "Keyboard typing (short)",
			description: "Shorter keyboard typing clip.",
			builtin: true,
		},
		{
			id: "custom" as const,
			label: "Custom URL",
			description: "Provide your own audio file URL.",
			builtin: false,
		},
	];

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Audio clip</Label>
				<Select
					value={value.clip}
					onValueChange={(clip) => {
						if (!clip) {
							return;
						}
						onChange({
							...value,
							clip: clip as AudioClipId,
						});
					}}
				>
					<SelectTrigger className="w-full bg-background">
						<SelectValue placeholder="Select clip" />
					</SelectTrigger>
					<SelectContent>
						{clips.map((clip) => (
							<SelectItem key={clip.id} value={clip.id}>
								{clip.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					{clips.find((clip) => clip.id === value.clip)
						?.description ?? "LiveKit default or custom audio."}
				</p>
			</div>

			{value.clip === "custom" ? (
				<Input
					className="bg-background"
					value={value.url}
					onChange={(e) =>
						onChange({
							...value,
							url: e.target.value,
						})
					}
					placeholder="Audio URL"
				/>
			) : null}

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label className="text-xs">Volume</Label>
					<span className="text-xs text-muted-foreground">
						{Math.round(value.volume * 100)}%
					</span>
				</div>
				<Slider
					min={0}
					max={100}
					value={[value.volume * 100]}
					onValueChange={(rawValue) => {
						const raw = Array.isArray(rawValue)
							? rawValue[0]
							: rawValue;
						onChange({
							...value,
							volume: (raw ?? 50) / 100,
						});
					}}
				/>
			</div>
		</div>
	);
}

export function VoiceSection({ config, onConfigChange }: VoiceSectionProps) {
	const turnDetection = config.turn_detection ?? {
		mode: "vad" as const,
		params: {},
	};

	return (
		<div className="rounded-xl border bg-card divide-y">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Voice speed"
					description="Adjust the speaking speed of your assistant."
				/>
				<VoiceSpeedPicker
					value={config.tts?.speed}
					onChange={(speed) =>
						onConfigChange({
							tts: {
								...(config.tts ?? {
									provider_model_id: null,
									params: {},
								}),
								speed,
							},
						})
					}
				/>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="Expressive speech"
					description="Makes the assistant sound more natural and expressive."
					checked={config.expressive_speech.enabled}
					onCheckedChange={(enabled) =>
						onConfigChange({
							expressive_speech: {
								...config.expressive_speech,
								enabled,
							},
						})
					}
				>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs">Intensity</Label>
							<span className="text-xs text-muted-foreground">
								{Math.round(
									config.expressive_speech.intensity * 100,
								)}
								%
							</span>
						</div>
						<Slider
							min={0}
							max={100}
							value={[config.expressive_speech.intensity * 100]}
							onValueChange={(value) => {
								const raw = Array.isArray(value)
									? value[0]
									: value;
								onConfigChange({
									expressive_speech: {
										...config.expressive_speech,
										intensity: (raw ?? 50) / 100,
									},
								});
							}}
						/>
					</div>
				</ConfigureSectionToggle>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="Noise filtering"
					description="Reduces background noise on the caller's audio before it reaches the assistant."
					checked={config.noise_filtering.enabled}
					onCheckedChange={(enabled) =>
						onConfigChange({
							noise_filtering: {
								...config.noise_filtering,
								enabled,
							},
						})
					}
				>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs">Suppression level</Label>
							<span className="text-xs text-muted-foreground">
								{config.noise_filtering.suppression_level}%
							</span>
						</div>
						<Slider
							min={0}
							max={100}
							value={[config.noise_filtering.suppression_level]}
							onValueChange={(value) => {
								const raw = Array.isArray(value)
									? value[0]
									: value;
								onConfigChange({
									noise_filtering: {
										...config.noise_filtering,
										suppression_level: raw ?? 80,
									},
								});
							}}
						/>
					</div>
				</ConfigureSectionToggle>
			</div>

			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Voice activity detection"
					description="How the assistant detects when the caller has finished speaking."
				/>
				<ConfigureRadioCard
					value={turnDetection.mode}
					onChange={(mode) =>
						onConfigChange({
							turn_detection: { ...turnDetection, mode },
						})
					}
					options={[
						{
							value: "vad",
							label: "VAD",
							description:
								"Uses voice activity detection to end turns.",
						},
						{
							value: "stt",
							label: "STT",
							description:
								"Uses speech-to-text endpointing to end turns.",
						},
						{
							value: "manual",
							label: "Manual",
							description:
								"Turns end only when explicitly signaled.",
						},
						{
							value: "realtime_multimodal",
							label: "Realtime",
							description:
								"Uses the realtime model's built-in turn detection.",
						},
					]}
				/>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="Background audio"
					description="Plays LiveKit ambient audio during calls."
					checked={config.background_audio.enabled}
					onCheckedChange={(enabled) =>
						onConfigChange({
							background_audio: {
								...config.background_audio,
								enabled,
							},
						})
					}
				>
					<AudioClipFields
						value={config.background_audio}
						onChange={(background_audio) =>
							onConfigChange({
								background_audio:
									background_audio as BackgroundAudioConfig,
							})
						}
					/>
				</ConfigureSectionToggle>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="On tool call audio"
					description="Plays LiveKit thinking audio while tools are running."
					checked={config.tool_call_audio.enabled}
					onCheckedChange={(enabled) =>
						onConfigChange({
							tool_call_audio: {
								...config.tool_call_audio,
								enabled,
							},
						})
					}
				>
					<AudioClipFields
						value={config.tool_call_audio}
						onChange={(tool_call_audio) =>
							onConfigChange({
								tool_call_audio:
									tool_call_audio as ToolCallAudioConfig,
							})
						}
					/>
				</ConfigureSectionToggle>
			</div>
		</div>
	);
}

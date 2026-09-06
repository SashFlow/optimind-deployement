"use client";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Slider } from "@repo/ui/slider";
import { ConfigureRadioCard } from "@/components/saas/agents/configure/ConfigureRadioCard";
import { ConfigureSectionToggle } from "@/components/saas/agents/configure/ConfigureSectionToggle";
import { VoiceSpeedPicker } from "@/components/saas/agents/configure/VoiceSpeedPicker";
import type { AgentConfigDocument } from "@/lib/agent-config";

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
					title="Noise cancel"
					description="Filters background noise from the caller's audio."
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
					<div className="space-y-1.5">
						<Label className="text-xs">
							Noise suppression level
						</Label>
						<Input
							type="number"
							min={0}
							max={100}
							className="bg-background sm:max-w-xs"
							value={config.noise_filtering.suppression_level}
							onChange={(e) =>
								onConfigChange({
									noise_filtering: {
										...config.noise_filtering,
										suppression_level: Number(
											e.target.value,
										),
									},
								})
							}
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
					description="Plays a looping audio track during calls."
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
					<Input
						className="bg-background"
						value={config.background_audio.url}
						onChange={(e) =>
							onConfigChange({
								background_audio: {
									...config.background_audio,
									url: e.target.value,
								},
							})
						}
						placeholder="Audio URL"
					/>
				</ConfigureSectionToggle>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="On tool call audio"
					description="Plays audio while tools are running."
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
					<div className="space-y-4">
						<Input
							className="bg-background"
							value={config.tool_call_audio.url}
							onChange={(e) =>
								onConfigChange({
									tool_call_audio: {
										...config.tool_call_audio,
										url: e.target.value,
									},
								})
							}
							placeholder="Audio URL"
						/>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs">Volume</Label>
								<span className="text-xs text-muted-foreground">
									{Math.round(
										config.tool_call_audio.volume * 100,
									)}
									%
								</span>
							</div>
							<Slider
								min={0}
								max={100}
								value={[config.tool_call_audio.volume * 100]}
								onValueChange={(value) => {
									const raw = Array.isArray(value)
										? value[0]
										: value;
									onConfigChange({
										tool_call_audio: {
											...config.tool_call_audio,
											volume: (raw ?? 50) / 100,
										},
									});
								}}
							/>
						</div>
					</div>
				</ConfigureSectionToggle>
			</div>
		</div>
	);
}

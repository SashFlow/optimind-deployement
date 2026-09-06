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
import { cn } from "@repo/ui/utils";
import type { ReactNode } from "react";
import { CallEndingFields } from "@/components/saas/agents/configure/CallEndingFields";
import { ConfigureMarkdownEditor } from "@/components/saas/agents/configure/ConfigureMarkdownEditor";
import { ConfigureRadioCard } from "@/components/saas/agents/configure/ConfigureRadioCard";
import {
	KnowledgeBaseSelect,
	type KnowledgeBaseSource,
} from "@/components/saas/agents/configure/KnowledgeBaseSelect";
import { LocaleCombobox } from "@/components/saas/agents/configure/LocaleCombobox";
import { ModelSelect } from "@/components/saas/agents/configure/ModelSelect";
import { VoicePreviewButton } from "@/components/saas/agents/configure/VoicePreviewButton";
import type { AgentConfigDocument } from "@/lib/agent-config";
import {
	isRealtimePipeline,
	modelSupportsTextOutput,
	realtimeUsesExternalTts,
	selectLlmModel,
	selectPrimaryLanguage,
	selectRealtimeModel,
	selectRealtimeOutputModality,
	selectRealtimeVoice,
	selectSttModel,
	selectTtsModel,
	selectTtsVoice,
	setPipelineMode,
} from "@/lib/agent-pipeline";
import { useLanguagesQuery } from "@/services/api/hooks";
import type {
	Provider,
	ProviderModel,
	ProviderVoice,
} from "@/services/api/types";

const GREETING_TRIGGER_OPTIONS = [
	{ value: "on_join", label: "On join" },
	{ value: "on_first_speech", label: "On first speech" },
	{ value: "manual", label: "Manual" },
] as const;

type GeneralSectionProps = {
	config: AgentConfigDocument;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
	providers: Provider[];
	llmModels: ProviderModel[];
	realtimeModels: ProviderModel[];
	sttModels: ProviderModel[];
	ttsModels: ProviderModel[];
	voices: ProviderVoice[];
	knowledgeBases: KnowledgeBaseSource[];
};

function FieldBlock({
	label,
	description,
	children,
	className,
}: {
	label: string;
	description?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("space-y-2", className)}>
			<div>
				<Label className="text-sm font-medium">{label}</Label>
				{description ? (
					<p className="mt-0.5 text-xs text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</div>
	);
}

export function GeneralSection({
	config,
	onConfigChange,
	providers,
	llmModels,
	realtimeModels,
	sttModels,
	ttsModels,
	voices,
	knowledgeBases,
}: GeneralSectionProps) {
	const languagesQuery = useLanguagesQuery();
	const isRealtime = isRealtimePipeline(config);
	const selectedRealtimeModel = realtimeModels.find(
		(model) => model.id === config.realtime?.provider_model_id,
	);
	const supportsTextOutput = modelSupportsTextOutput(selectedRealtimeModel);
	const usesExternalTts = realtimeUsesExternalTts(
		config,
		selectedRealtimeModel,
	);
	const outputModality = config.realtime?.output_modality ?? "audio";
	const activeVoiceId = usesExternalTts
		? config.tts?.voice_id
		: isRealtime
			? config.realtime?.voice_id
			: config.tts?.voice_id;
	const selectedVoice = voices.find((v) => v.voice_id === activeVoiceId);

	function update(patch: Partial<AgentConfigDocument>) {
		onConfigChange(patch);
	}

	return (
		<div className="rounded-xl border bg-card">
			<div className="space-y-4 border-b px-4 py-4 md:px-5">
				<div>
					<h3 className="text-sm font-semibold">Pipeline</h3>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Choose how speech is processed end-to-end.
					</p>
				</div>
				<ConfigureRadioCard
					value={config.pipeline_mode}
					onChange={(mode) => update(setPipelineMode(config, mode))}
					options={[
						{
							value: "cascaded",
							label: "Cascaded",
							description:
								"Separate LLM, STT, and TTS models chained together.",
						},
						{
							value: "realtime",
							label: "Realtime",
							description:
								"Single speech-to-speech model with lower latency.",
						},
					]}
				/>
			</div>

			<div className="divide-y">
				<div className="space-y-4 px-4 py-4 md:px-5">
					{isRealtime ? (
						<FieldBlock
							label="Realtime model"
							description="Speech-to-speech model used for the entire conversation."
						>
							<ModelSelect
								models={realtimeModels}
								providers={providers}
								value={config.realtime?.provider_model_id ?? ""}
								onValueChange={(value) =>
									update(
										selectRealtimeModel(
											config,
											value,
											realtimeModels,
										),
									)
								}
								placeholder="Select realtime model"
							/>
						</FieldBlock>
					) : (
						<FieldBlock
							label="LLM"
							description="Language model that drives reasoning and responses."
						>
							<ModelSelect
								models={llmModels}
								providers={providers}
								value={config.llm?.provider_model_id ?? ""}
								onValueChange={(value) =>
									update(
										selectLlmModel(
											config,
											value,
											llmModels,
										),
									)
								}
								placeholder="Select LLM model"
							/>
						</FieldBlock>
					)}

					{!isRealtime ? (
						<FieldBlock
							label="STT"
							description="Converts caller speech into text for the LLM."
						>
							<ModelSelect
								models={sttModels}
								providers={providers}
								value={config.stt?.provider_model_id ?? ""}
								onValueChange={(value) =>
									update(
										selectSttModel(
											config,
											value,
											sttModels,
										),
									)
								}
								placeholder="Select STT model"
							/>
						</FieldBlock>
					) : null}
				</div>

				<div className="space-y-4 px-4 py-4 md:px-5">
					<div>
						<h3 className="text-sm font-semibold">Voice output</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{isRealtime
								? usesExternalTts
									? "External TTS converts the realtime model's text responses to speech."
									: "Voice used by the realtime speech-to-speech model."
								: "Text-to-speech model and voice for assistant responses."}
						</p>
					</div>

					{isRealtime ? (
						<div className="space-y-4">
							{supportsTextOutput ? (
								<ConfigureRadioCard
									value={outputModality}
									onChange={(modality) =>
										update(
											selectRealtimeOutputModality(
												config,
												modality,
											),
										)
									}
									options={[
										{
											value: "audio",
											label: "Built-in voice",
											description:
												"Use the realtime model's native speech output.",
										},
										{
											value: "text",
											label: "External TTS",
											description:
												"Use text-only realtime output with a separate TTS model.",
										},
									]}
								/>
							) : null}

							{usesExternalTts ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<FieldBlock label="TTS model">
										<ModelSelect
											models={ttsModels}
											providers={providers}
											value={
												config.tts?.provider_model_id ??
												""
											}
											onValueChange={(value) =>
												update(
													selectTtsModel(
														config,
														value,
														ttsModels,
													),
												)
											}
											placeholder="Select TTS model"
										/>
									</FieldBlock>

									<FieldBlock label="Voice">
										<div className="flex items-center gap-2">
											<Select
												value={
													config.tts?.voice_id ?? ""
												}
												onValueChange={(value) =>
													value &&
													update(
														selectTtsVoice(
															config,
															value,
														),
													)
												}
												disabled={
													!config.tts
														?.provider_model_id
												}
												items={voices.map((voice) => ({
													value: voice.voice_id,
													label: voice.label,
												}))}
											>
												<SelectTrigger className="w-full bg-background">
													<SelectValue
														placeholder={
															config.tts
																?.provider_model_id
																? "Select voice"
																: "Select a TTS model first"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{voices.map((voice) => (
														<SelectItem
															key={voice.id}
															value={
																voice.voice_id
															}
														>
															{voice.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<VoicePreviewButton
												previewUrl={
													selectedVoice?.preview_url
												}
											/>
										</div>
									</FieldBlock>
								</div>
							) : (
								<FieldBlock label="Voice">
									<div className="flex items-center gap-2 sm:max-w-xs">
										<Select
											value={
												config.realtime?.voice_id ?? ""
											}
											onValueChange={(value) =>
												value &&
												update(
													selectRealtimeVoice(
														config,
														value,
													),
												)
											}
											disabled={
												!config.realtime
													?.provider_model_id
											}
											items={voices.map((voice) => ({
												value: voice.voice_id,
												label: voice.label,
											}))}
										>
											<SelectTrigger className="w-full bg-background">
												<SelectValue
													placeholder={
														config.realtime
															?.provider_model_id
															? "Select voice"
															: "Select a realtime model first"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{voices.map((voice) => (
													<SelectItem
														key={voice.id}
														value={voice.voice_id}
													>
														{voice.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<VoicePreviewButton
											previewUrl={
												selectedVoice?.preview_url
											}
										/>
									</div>
								</FieldBlock>
							)}
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2">
							<FieldBlock label="TTS model">
								<ModelSelect
									models={ttsModels}
									providers={providers}
									value={config.tts?.provider_model_id ?? ""}
									onValueChange={(value) =>
										update(
											selectTtsModel(
												config,
												value,
												ttsModels,
											),
										)
									}
									placeholder="Select TTS model"
								/>
							</FieldBlock>

							<FieldBlock label="Voice">
								<div className="flex items-center gap-2">
									<Select
										value={config.tts?.voice_id ?? ""}
										onValueChange={(value) =>
											value &&
											update(
												selectTtsVoice(config, value),
											)
										}
										disabled={
											!config.tts?.provider_model_id
										}
										items={voices.map((voice) => ({
											value: voice.voice_id,
											label: voice.label,
										}))}
									>
										<SelectTrigger className="w-full bg-background">
											<SelectValue
												placeholder={
													config.tts
														?.provider_model_id
														? "Select voice"
														: "Select a TTS model first"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{voices.map((voice) => (
												<SelectItem
													key={voice.id}
													value={voice.voice_id}
												>
													{voice.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<VoicePreviewButton
										previewUrl={selectedVoice?.preview_url}
									/>
								</div>
							</FieldBlock>
						</div>
					)}
				</div>

				<div className="px-4 py-4 md:px-5">
					<FieldBlock
						label="Primary language"
						description="Optional. Helps the assistant default to a specific language."
					>
						<LocaleCombobox
							options={languagesQuery.data ?? []}
							value={config.language.primary}
							onChange={(primary) =>
								update(
									selectPrimaryLanguage(
										config,
										primary ?? "none",
									),
								)
							}
							placeholder="Select language"
							allowNone
							isLoading={languagesQuery.isLoading}
							className="sm:max-w-xs"
						/>
					</FieldBlock>
				</div>

				<div className="px-4 py-4 md:px-5">
					<FieldBlock
						label="Knowledge base"
						description="Sources the assistant can search when answering questions."
					>
						<KnowledgeBaseSelect
							selectedIds={config.knowledge_base_ids}
							sources={knowledgeBases}
							onChange={(knowledge_base_ids) =>
								update({ knowledge_base_ids })
							}
						/>
					</FieldBlock>
				</div>

				<div className="space-y-4 px-4 py-4 md:px-5">
					<div>
						<h3 className="text-sm font-semibold">First message</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Greeting spoken when a session starts.
						</p>
					</div>
					<div className="space-y-4">
						<div className="space-y-2 flex items-center justify-between">
							<label className="flex items-center gap-2 text-sm w-full">
								<Switch
									checked={config.greeting.enabled}
									onCheckedChange={(enabled) =>
										update({
											greeting: {
												...config.greeting,
												enabled,
											},
										})
									}
								/>
								Enabled
							</label>
							<div className="space-y-2 w-full flex justify-end">
								<Select
									value={config.greeting.trigger}
									onValueChange={(value) =>
										value &&
										update({
											greeting: {
												...config.greeting,
												trigger:
													value as AgentConfigDocument["greeting"]["trigger"],
											},
										})
									}
									items={[...GREETING_TRIGGER_OPTIONS]}
								>
									<SelectTrigger className="w-full bg-background sm:max-w-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{GREETING_TRIGGER_OPTIONS.map(
											(option) => (
												<SelectItem
													key={option.value}
													value={option.value}
												>
													{option.label}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
						<ConfigureMarkdownEditor
							value={config.greeting.text}
							onChange={(text) =>
								update({
									greeting: { ...config.greeting, text },
								})
							}
							placeholder="Write your greeting message..."
							minHeight="96px"
							variables={config.variables}
							environmentVariables={config.environment_variables}
						/>
					</div>
				</div>

				<div className="space-y-4 px-4 py-4 md:px-5">
					<div>
						<h3 className="text-sm font-semibold">Call ending</h3>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Farewell behavior when a call ends.
						</p>
					</div>
					<CallEndingFields
						callEnding={config.call_ending}
						onChange={(call_ending) => update({ call_ending })}
						variables={config.variables}
						environmentVariables={config.environment_variables}
					/>
				</div>
			</div>
		</div>
	);
}

import type { AgentConfigDocument } from "@/lib/agent-config";
import type { ProviderModel } from "@/services/api/types";

export function isRealtimePipeline(config: AgentConfigDocument): boolean {
	return config.pipeline_mode === "realtime";
}

export function isLivePipeline(config: AgentConfigDocument): boolean {
	return config.pipeline_mode === "live";
}

export function isCascadedPipeline(config: AgentConfigDocument): boolean {
	return config.pipeline_mode === "cascaded";
}

export function modelSupportsTextOutput(
	model: ProviderModel | undefined | null,
): boolean {
	return Boolean(model?.supports_text_output);
}

export function realtimeUsesExternalTts(
	config: AgentConfigDocument,
	realtimeModel?: ProviderModel | null,
): boolean {
	if (!isRealtimePipeline(config)) {
		return false;
	}
	if (!modelSupportsTextOutput(realtimeModel)) {
		return false;
	}
	return (config.realtime?.output_modality ?? "audio") === "text";
}

export function getVoiceModelId(
	config: AgentConfigDocument,
	selectedRealtimeModel?: ProviderModel | null,
): string | null {
	if (isLivePipeline(config)) {
		return config.live?.provider_model_id ?? null;
	}
	if (isRealtimePipeline(config)) {
		if (realtimeUsesExternalTts(config, selectedRealtimeModel)) {
			return config.tts?.provider_model_id ?? null;
		}
		return config.realtime?.provider_model_id ?? null;
	}
	return config.tts?.provider_model_id ?? null;
}

export function setPipelineMode(
	config: AgentConfigDocument,
	mode: AgentConfigDocument["pipeline_mode"],
): Partial<AgentConfigDocument> {
	const turnMode =
		mode === "realtime" || mode === "live" ? "realtime_multimodal" : "vad";
	const patch: Partial<AgentConfigDocument> = {
		pipeline_mode: mode,
		turn_detection: {
			...config.turn_detection,
			mode: turnMode,
		},
	};
	if (mode === "live") {
		patch.tts = null;
	}
	return patch;
}

export function selectLlmModel(
	_config: AgentConfigDocument,
	providerModelId: string,
	_models: ProviderModel[],
): Partial<AgentConfigDocument> {
	return {
		llm: {
			provider_model_id: providerModelId,
			params: {},
		},
	};
}

export function selectSttModel(
	_config: AgentConfigDocument,
	providerModelId: string,
	_models: ProviderModel[],
): Partial<AgentConfigDocument> {
	return {
		stt: {
			provider_model_id: providerModelId,
			params: {},
		},
	};
}

export function selectTtsModel(
	config: AgentConfigDocument,
	providerModelId: string,
	_models: ProviderModel[],
): Partial<AgentConfigDocument> {
	return {
		tts: {
			...config.tts,
			provider_model_id: providerModelId,
			voice_id: null,
			params: config.tts?.params ?? {},
		},
	};
}

export function selectTtsVoice(
	config: AgentConfigDocument,
	voiceId: string,
): Partial<AgentConfigDocument> {
	return {
		tts: {
			...config.tts,
			provider_model_id: config.tts?.provider_model_id ?? null,
			voice_id: voiceId,
			params: config.tts?.params ?? {},
		},
	};
}

export function selectRealtimeModel(
	config: AgentConfigDocument,
	providerModelId: string,
	models: ProviderModel[],
): Partial<AgentConfigDocument> {
	const model = models.find((item) => item.id === providerModelId);
	const supportsText = modelSupportsTextOutput(model);
	return {
		realtime: {
			...config.realtime,
			provider_model_id: providerModelId,
			voice_id: null,
			output_modality: supportsText
				? (config.realtime?.output_modality ?? "audio")
				: "audio",
			params: config.realtime?.params ?? {},
		},
	};
}

export function selectRealtimeVoice(
	config: AgentConfigDocument,
	voiceId: string,
): Partial<AgentConfigDocument> {
	return {
		realtime: {
			...config.realtime,
			provider_model_id: config.realtime?.provider_model_id ?? null,
			voice_id: voiceId,
			output_modality: config.realtime?.output_modality ?? "audio",
			params: config.realtime?.params ?? {},
		},
	};
}

export function selectRealtimeOutputModality(
	config: AgentConfigDocument,
	modality: "audio" | "text",
): Partial<AgentConfigDocument> {
	return {
		realtime: {
			...config.realtime,
			provider_model_id: config.realtime?.provider_model_id ?? null,
			voice_id:
				modality === "audio"
					? (config.realtime?.voice_id ?? null)
					: null,
			output_modality: modality,
			params: config.realtime?.params ?? {},
		},
	};
}

export function selectLiveModel(
	config: AgentConfigDocument,
	providerModelId: string,
	models: ProviderModel[],
	llmModels: ProviderModel[],
): Partial<AgentConfigDocument> {
	const liveModel = models.find((item) => item.id === providerModelId);
	const currentReasoningId = config.llm?.provider_model_id ?? null;
	const currentReasoning = llmModels.find(
		(item) => item.id === currentReasoningId,
	);
	const reasoningCompatible =
		liveModel &&
		currentReasoning &&
		currentReasoning.provider_id === liveModel.provider_id;

	return {
		live: {
			...config.live,
			provider_model_id: providerModelId,
			voice_id: null,
			params: config.live?.params ?? {},
		},
		llm: reasoningCompatible
			? config.llm
			: {
					provider_model_id: null,
					params: {},
				},
		tts: null,
	};
}

export function selectLiveVoice(
	config: AgentConfigDocument,
	voiceId: string,
): Partial<AgentConfigDocument> {
	return {
		live: {
			...config.live,
			provider_model_id: config.live?.provider_model_id ?? null,
			voice_id: voiceId,
			params: config.live?.params ?? {},
		},
	};
}

export function selectLiveReasoningModel(
	config: AgentConfigDocument,
	providerModelId: string,
	llmModels: ProviderModel[],
	liveModels: ProviderModel[],
): Partial<AgentConfigDocument> {
	const liveModel = liveModels.find(
		(item) => item.id === config.live?.provider_model_id,
	);
	const reasoningModel = llmModels.find(
		(item) => item.id === providerModelId,
	);
	if (
		liveModel &&
		reasoningModel &&
		liveModel.provider_id !== reasoningModel.provider_id
	) {
		return {};
	}
	return {
		llm: {
			provider_model_id: providerModelId,
			params: {},
		},
	};
}

export function selectPrimaryLanguage(
	config: AgentConfigDocument,
	primary: string | null,
): Partial<AgentConfigDocument> {
	return {
		language: {
			primary: primary === "none" ? null : primary,
			secondary: config.language.secondary,
		},
	};
}

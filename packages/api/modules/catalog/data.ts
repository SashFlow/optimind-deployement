export type CatalogProvider = {
	id: string;
	display_name: string;
};

export type CatalogReasoning = {
	/** Ordered lowest → highest. First entry is the default when unset. */
	levels: string[];
};

export type CatalogModel = {
	id: string;
	display_name: string;
	provider_id: string;
	is_enabled: boolean;
	kind: "llm" | "realtime" | "live" | "stt" | "tts";
	supports_text_output?: boolean;
	/** Present when the model supports configurable reasoning / thinking effort. */
	reasoning?: CatalogReasoning | null;
	/**
	 * How the worker should reach the model.
	 * `livekit_inference` uses LiveKit Cloud (no provider API key required).
	 */
	delivery?: "byok" | "livekit_inference";
	/**
	 * Hosts that serve this model on LiveKit Inference (e.g. livekit, azure, baseten).
	 * Only set when `delivery` is `livekit_inference`.
	 */
	inference_providers?: string[];
	/**
	 * Groups BYOK + LiveKit Inference twins so the UI shows one model with a
	 * delivery picker (e.g. Inworld TTS 2).
	 */
	variant_group?: string;
	/**
	 * When the same model id supports both paths (no separate twin id), list
	 * both options so the UI can offer a delivery picker.
	 */
	available_deliveries?: Array<"byok" | "livekit_inference">;
};

export type CatalogVoice = {
	id: string;
	voice_id: string;
	label: string;
	preview_url?: string | null;
	provider_model_id: string;
};

export type AvatarModel = {
	id: string;
	display_name: string;
};

export type CatalogAudioClip = {
	id: "office_ambience" | "keyboard_typing" | "keyboard_typing2" | "custom";
	label: string;
	description: string;
	builtin: boolean;
};

export const CATALOG_PROVIDERS: CatalogProvider[] = [
	{ id: "openai", display_name: "OpenAI" },
	{ id: "gemini", display_name: "Google Gemini" },
	{ id: "anthropic", display_name: "Anthropic" },
	{ id: "sarvam", display_name: "Sarvam" },
	{ id: "inworld", display_name: "Inworld" },
	{ id: "livekit", display_name: "LiveKit" },
	{ id: "deepgram", display_name: "Deepgram" },
	{ id: "cartesia", display_name: "Cartesia" },
	{ id: "assemblyai", display_name: "AssemblyAI" },
	{ id: "fishaudio", display_name: "Fish Audio" },
	{ id: "speechmatics", display_name: "Speechmatics" },
	{ id: "rime", display_name: "Rime" },
	{ id: "gradium", display_name: "Gradium" },
	{ id: "xai", display_name: "xAI" },
	{ id: "meta", display_name: "Meta" },
	{ id: "microsoft", display_name: "Microsoft AI" },
	{ id: "deepseek-ai", display_name: "DeepSeek" },
	{ id: "moonshotai", display_name: "Kimi" },
	{ id: "zai", display_name: "Z.ai" },
];

/** OpenAI GPT-5 (pre-5.1): no `none`, lowest is `minimal`. */
const OPENAI_REASONING_MINIMAL: CatalogReasoning = {
	levels: ["minimal", "low", "medium", "high"],
};

/** OpenAI GPT-5.1+: supports `none` as lowest; some add `xhigh`. */
const OPENAI_REASONING_NONE: CatalogReasoning = {
	levels: ["none", "low", "medium", "high"],
};
const OPENAI_REASONING_NONE_XHIGH: CatalogReasoning = {
	levels: ["none", "low", "medium", "high", "xhigh"],
};

/** Claude effort levels (lowest = `low`). */
const CLAUDE_REASONING_FULL: CatalogReasoning = {
	levels: ["low", "medium", "high", "xhigh", "max"],
};
const CLAUDE_REASONING_MAX: CatalogReasoning = {
	levels: ["low", "medium", "high", "max"],
};
const CLAUDE_REASONING_BASIC: CatalogReasoning = {
	levels: ["low", "medium", "high"],
};

/** Gemini thinking_level sets (lowest first). */
const GEMINI_REASONING_MINIMAL: CatalogReasoning = {
	levels: ["minimal", "low", "medium", "high"],
};
const GEMINI_REASONING_LOW: CatalogReasoning = {
	levels: ["low", "medium", "high"],
};
const GEMINI_REASONING_MINIMAL_HIGH: CatalogReasoning = {
	levels: ["minimal", "high"],
};

/** Sarvam Inference reasoning_effort (lowest first). glm* cannot disable thinking. */
const SARVAM_REASONING_GLM: CatalogReasoning = {
	levels: ["low", "high", "max"],
};
const SARVAM_REASONING_NONE: CatalogReasoning = {
	levels: ["none", "low", "medium", "high", "max"],
};
const SARVAM_REASONING_OPTIONAL: CatalogReasoning = {
	levels: ["low", "high", "max"],
};
const SARVAM_REASONING_DEEPSEEK: CatalogReasoning = {
	levels: ["none", "low", "high", "max"],
};

function model(
	id: string,
	display_name: string,
	provider_id: string,
	kind: CatalogModel["kind"],
	extra?: Partial<CatalogModel>,
): CatalogModel {
	return {
		id,
		display_name,
		provider_id,
		is_enabled: true,
		kind,
		...extra,
	};
}

/** LiveKit Inference catalog entry (gateway; no provider API key required). */
function inferenceModel(
	id: string,
	display_name: string,
	provider_id: string,
	kind: CatalogModel["kind"],
	inference_providers: string[],
	extra?: Partial<CatalogModel>,
): CatalogModel {
	return model(id, display_name, provider_id, kind, {
		delivery: "livekit_inference",
		inference_providers,
		...extra,
	});
}

export const CATALOG_MODELS: CatalogModel[] = [
	// LLM — OpenAI
	model("chat-latest", "ChatGPT Latest", "openai", "llm"),
	model("gpt-4.1", "GPT-4.1", "openai", "llm"),
	model("gpt-4.1-mini", "GPT-4.1 Mini", "openai", "llm"),
	model("gpt-4.1-nano", "GPT-4.1 Nano", "openai", "llm"),
	model("gpt-4o", "GPT-4o", "openai", "llm"),
	model("gpt-4o-mini", "GPT-4o Mini", "openai", "llm"),
	model("gpt-5", "GPT-5", "openai", "llm", {
		reasoning: OPENAI_REASONING_MINIMAL,
	}),
	model("gpt-5-mini", "GPT-5 Mini", "openai", "llm", {
		reasoning: OPENAI_REASONING_MINIMAL,
	}),
	model("gpt-5-nano", "GPT-5 Nano", "openai", "llm", {
		reasoning: OPENAI_REASONING_MINIMAL,
	}),
	model("gpt-5.1", "GPT-5.1", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE,
	}),
	model("gpt-5.2", "GPT-5.2", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.4", "GPT-5.4", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.4-mini", "GPT-5.4 Mini", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.4-nano", "GPT-5.4 Nano", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE,
	}),
	model("gpt-5.5", "GPT-5.5", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.6-luna", "GPT-5.6 Luna", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.6-sol", "GPT-5.6 Sol", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),
	model("gpt-5.6-terra", "GPT-5.6 Terra", "openai", "llm", {
		reasoning: OPENAI_REASONING_NONE_XHIGH,
	}),

	// LLM — Gemini
	model("gemini-3-flash-preview", "Gemini 3 Flash", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL,
	}),
	model("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL,
	}),
	model("gemini-3.1-pro-preview", "Gemini 3.1 Pro", "gemini", "llm", {
		reasoning: GEMINI_REASONING_LOW,
	}),
	model("gemini-3.5-flash", "Gemini 3.5 Flash", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL,
	}),
	model("gemini-3.5-flash-lite", "Gemini 3.5 Flash Lite", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL,
	}),
	model("gemini-3.6-flash", "Gemini 3.6 Flash", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL,
	}),
	model("gemini-3.7-flash", "Gemini 3.7 Flash", "gemini", "llm", {
		reasoning: GEMINI_REASONING_LOW,
	}),
	model("gemini-3.8-flash", "Gemini 3.8 Flash", "gemini", "llm", {
		reasoning: GEMINI_REASONING_LOW,
	}),
	model("gemma-4-31b-it", "Gemma 4 31B IT", "gemini", "llm", {
		reasoning: GEMINI_REASONING_MINIMAL_HIGH,
		delivery: "byok",
		variant_group: "gemma-4-31b-it",
	}),

	// LLM — Anthropic (Claude)
	model("claude-fable-5-1", "Claude Fable 5.1", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-mythos-5-1", "Claude Mythos 5.1", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-opus-5-5", "Claude Opus 5.5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-sonnet-5-5", "Claude Sonnet 5.5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-haiku-5-5", "Claude Haiku 5.5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-fable-5", "Claude Fable 5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-mythos-5", "Claude Mythos 5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-opus-5", "Claude Opus 5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-sonnet-5", "Claude Sonnet 5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-opus-4-8", "Claude Opus 4.8", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-opus-4-7", "Claude Opus 4.7", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_FULL,
	}),
	model("claude-opus-4-6", "Claude Opus 4.6", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_MAX,
	}),
	model("claude-sonnet-4-6", "Claude Sonnet 4.6", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_MAX,
	}),
	model("claude-opus-4-5-20251101", "Claude Opus 4.5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_BASIC,
	}),
	model("claude-haiku-4-5-20251001", "Claude Haiku 4.5", "anthropic", "llm", {
		reasoning: CLAUDE_REASONING_BASIC,
	}),

	// LLM — Inworld Inference (hosted)
	model(
		"inworld/models/gemma-4-26b-a4b-it",
		"Gemma 4 26B (Inworld)",
		"inworld",
		"llm",
	),
	model(
		"inworld/models/gemma-4-31b-it",
		"Gemma 4 31B (Inworld)",
		"inworld",
		"llm",
	),
	model(
		"inworld/models/GLM-5.3-Flash",
		"GLM 5.3 Flash (Inworld)",
		"inworld",
		"llm",
	),
	model(
		"inworld/models/deepseek-v4.1-flash",
		"DeepSeek V4.1 Flash (Inworld)",
		"inworld",
		"llm",
	),
	model(
		"inworld/models/deepseek-v4-flash-0731",
		"DeepSeek V4 Flash (Inworld)",
		"inworld",
		"llm",
	),

	// LLM — Sarvam Inference (OpenAI-compat /v2; conversations is /v1-only)
	model("sarvam/glm5.3-flash", "GLM 5.3 Flash (Sarvam)", "sarvam", "llm", {
		reasoning: SARVAM_REASONING_GLM,
	}),
	model("sarvam/glm5.3", "GLM 5.3 (Sarvam)", "sarvam", "llm", {
		reasoning: SARVAM_REASONING_GLM,
	}),
	model("sarvam/sarvam-105b", "Sarvam 105B", "sarvam", "llm", {
		reasoning: SARVAM_REASONING_NONE,
	}),
	model(
		"sarvam/sarvam-105b-conversations",
		"Sarvam 105B Conversations",
		"sarvam",
		"llm",
		{
			reasoning: SARVAM_REASONING_NONE,
		},
	),
	model("sarvam/gemma4", "Gemma 4 (Sarvam)", "sarvam", "llm", {
		reasoning: SARVAM_REASONING_OPTIONAL,
	}),
	model(
		"sarvam/deepseekv4.1-flash-1017",
		"DeepSeek V4.1 Flash (Sarvam)",
		"sarvam",
		"llm",
		{
			reasoning: SARVAM_REASONING_DEEPSEEK,
		},
	),
	model(
		"sarvam/deepseekv4.1-flash-1017-interactive",
		"DeepSeek V4.1 Flash Interactive (Sarvam)",
		"sarvam",
		"llm",
		{
			reasoning: SARVAM_REASONING_DEEPSEEK,
		},
	),

	// Realtime — OpenAI
	model("gpt-realtime-2.1", "GPT Realtime 2.1", "openai", "realtime", {
		supports_text_output: true,
	}),
	model(
		"gpt-realtime-2.1-mini",
		"GPT Realtime 2.1 Mini",
		"openai",
		"realtime",
		{
			supports_text_output: true,
		},
	),
	model("gpt-realtime-2", "GPT Realtime 2", "openai", "realtime", {
		supports_text_output: true,
	}),
	model("gpt-realtime-1.5", "GPT Realtime 1.5", "openai", "realtime", {
		supports_text_output: true,
	}),
	model("gpt-realtime", "GPT Realtime", "openai", "realtime", {
		supports_text_output: true,
	}),
	model("gpt-realtime-mini", "GPT Realtime Mini", "openai", "realtime", {
		supports_text_output: true,
	}),
	model(
		"gpt-4o-realtime-preview",
		"GPT-4o Realtime Preview",
		"openai",
		"realtime",
		{
			supports_text_output: true,
		},
	),
	model(
		"gpt-4o-mini-realtime-preview",
		"GPT-4o Mini Realtime Preview",
		"openai",
		"realtime",
		{
			supports_text_output: true,
		},
	),

	// Realtime — Gemini
	model("gemini-3.8-live", "Gemini 3.8 Live", "gemini", "realtime", {
		supports_text_output: false,
	}),
	model(
		"gemini-3.8-live-extended-thinking",
		"Gemini 3.8 Live Extended Thinking",
		"gemini",
		"realtime",
		{
			supports_text_output: false,
		},
	),
	model(
		"gemini-3.1-flash-live-preview",
		"Gemini 3.1 Flash Live",
		"gemini",
		"realtime",
		{
			supports_text_output: false,
		},
	),
	model(
		"gemini-2.5-flash-native-audio-preview-12-2025",
		"Gemini 2.5 Flash Native Audio",
		"gemini",
		"realtime",
		{
			supports_text_output: false,
		},
	),

	// Live (full-duplex + delegated reasoning)
	model("gpt-live-1", "GPT Live 1", "openai", "live"),

	// STT — OpenAI
	model("whisper-1", "Whisper", "openai", "stt"),
	model("gpt-4o-transcribe", "GPT-4o Transcribe", "openai", "stt"),
	model("gpt-4o-mini-transcribe", "GPT-4o Mini Transcribe", "openai", "stt"),
	model("gpt-realtime-whisper", "GPT Realtime Whisper", "openai", "stt"),

	// STT — Gemini
	model(
		"gemini-3.5-transcribe-live",
		"Gemini 3.5 Transcribe Live",
		"gemini",
		"stt",
		{
			delivery: "byok",
			variant_group: "gemini-3.5-transcribe-live",
		},
	),
	model("gemini-3.5-flash", "Gemini 3.5 Flash STT", "gemini", "stt"),
	model("gemini-3-flash-preview", "Gemini 3 Flash STT", "gemini", "stt"),
	model("gemini-3-pro-preview", "Gemini 3 Pro STT", "gemini", "stt"),
	model("gemini-2.5-flash", "Gemini 2.5 Flash STT", "gemini", "stt"),

	// STT — Sarvam
	model("sarvam:saaras:v4", "Saaras v4", "sarvam", "stt"),
	model("sarvam:saaras:v3", "Saaras v3", "sarvam", "stt"),
	model("sarvam:saaras:v3-realtime", "Saaras Realtime", "sarvam", "stt"),

	// STT — Inworld (same id for BYOK + LiveKit Inference)
	model("inworld/inworld-stt-1", "Inworld STT 1", "inworld", "stt", {
		delivery: "byok",
		variant_group: "inworld-stt-1",
		available_deliveries: ["byok", "livekit_inference"],
		inference_providers: ["inworld"],
	}),

	// TTS — OpenAI
	model("gpt-4o-mini-tts", "GPT-4o Mini TTS", "openai", "tts"),
	model("tts-1", "TTS-1", "openai", "tts"),
	model("tts-1-hd", "TTS-1 HD", "openai", "tts"),

	// TTS — Gemini
	model(
		"gemini-3.1-flash-tts-preview",
		"Gemini 3.1 Flash TTS",
		"gemini",
		"tts",
	),
	model(
		"gemini-2.5-flash-preview-tts",
		"Gemini 2.5 Flash TTS",
		"gemini",
		"tts",
	),
	model("gemini-2.5-pro-preview-tts", "Gemini 2.5 Pro TTS", "gemini", "tts"),

	// TTS — Sarvam
	model("sarvam:bulbul:v3", "Bulbul v3", "sarvam", "tts"),
	model("sarvam:bulbul:v2", "Bulbul v2", "sarvam", "tts"),

	// TTS — Inworld (BYOK; LiveKit Inference twins share variant_group)
	model("inworld-tts-1.5-max", "Inworld TTS 1.5 Max", "inworld", "tts", {
		delivery: "byok",
	}),
	model("inworld-tts-1.5-mini", "Inworld TTS 1.5 Mini", "inworld", "tts", {
		delivery: "byok",
	}),
	model("inworld-tts-2", "Inworld TTS 2", "inworld", "tts", {
		delivery: "byok",
		variant_group: "inworld-tts-2",
	}),
	model("inworld-tts-2-flash", "Inworld TTS 2 Flash", "inworld", "tts", {
		delivery: "byok",
		variant_group: "inworld-tts-2-flash",
	}),

	// ── LiveKit Inference (gateway) ──────────────────────────────────────────
	// LLM — LiveKit-hosted / gateway-only families
	inferenceModel(
		"google/gemma-4-31b-it",
		"Gemma 4 31B IT",
		"livekit",
		"llm",
		["livekit"],
		{
			reasoning: GEMINI_REASONING_MINIMAL_HIGH,
			variant_group: "gemma-4-31b-it",
		},
	),
	inferenceModel(
		"deepseek-ai/deepseek-v4-pro",
		"DeepSeek V4 Pro",
		"deepseek-ai",
		"llm",
		["vercel"],
	),
	inferenceModel(
		"deepseek-ai/deepseek-v4.1-flash",
		"DeepSeek V4.1 Flash",
		"deepseek-ai",
		"llm",
		["baseten"],
	),
	inferenceModel("google/gemini-4-argon", "Gemini 4 Argon", "gemini", "llm", [
		"google",
	]),
	inferenceModel(
		"google/gemini-4-hydrogen",
		"Gemini 4 Hydrogen",
		"gemini",
		"llm",
		["google"],
	),
	inferenceModel(
		"google/gemini-decision-1",
		"Gemini Decision 1",
		"gemini",
		"llm",
		["google"],
	),
	inferenceModel("meta/muse-spark-1.3", "Muse Spark 1.3", "meta", "llm", [
		"meta",
	]),
	inferenceModel("meta/muse-wonder-1.0", "Muse Wonder 1.0", "meta", "llm", [
		"meta",
	]),
	inferenceModel(
		"microsoft/decision-1",
		"Microsoft Decision 1",
		"microsoft",
		"llm",
		["azure"],
	),
	inferenceModel("moonshotai/kimi-k2.6", "Kimi K2.6", "moonshotai", "llm", [
		"vercel",
	]),
	inferenceModel(
		"openai/gpt-6-luna",
		"GPT-6 Luna",
		"openai",
		"llm",
		["azure", "openai"],
		{ reasoning: OPENAI_REASONING_NONE_XHIGH },
	),
	inferenceModel(
		"openai/gpt-6-luna-decisions",
		"GPT-6 Luna (Decisions)",
		"openai",
		"llm",
		["openai"],
		{ reasoning: OPENAI_REASONING_NONE_XHIGH },
	),
	inferenceModel(
		"openai/gpt-6-sol",
		"GPT-6 Sol",
		"openai",
		"llm",
		["azure", "openai"],
		{ reasoning: OPENAI_REASONING_NONE_XHIGH },
	),
	inferenceModel(
		"openai/gpt-6.1-sol",
		"GPT-6.1 Sol",
		"openai",
		"llm",
		["azure", "openai"],
		{ reasoning: OPENAI_REASONING_NONE_XHIGH },
	),
	inferenceModel(
		"openai/gpt-6.1-terra",
		"GPT-6.1 Terra",
		"openai",
		"llm",
		["openai"],
		{ reasoning: OPENAI_REASONING_NONE_XHIGH },
	),
	inferenceModel("openai/gpt-oss-120b", "GPT OSS 120B", "openai", "llm", [
		"baseten",
		"groq",
	]),
	inferenceModel(
		"xai/grok-4.20-0309-non-reasoning",
		"Grok 4.20",
		"xai",
		"llm",
		["xai"],
	),
	inferenceModel(
		"xai/grok-4.20-0309-reasoning",
		"Grok 4.20 Reasoning",
		"xai",
		"llm",
		["xai"],
	),
	inferenceModel(
		"xai/grok-4.20-multi-agent-0309",
		"Grok 4.20 Multi-Agent",
		"xai",
		"llm",
		["xai"],
	),
	inferenceModel("xai/grok-4.3", "Grok 4.3", "xai", "llm", ["xai"]),
	inferenceModel("xai/grok-4.5", "Grok 4.5", "xai", "llm", ["xai"]),
	inferenceModel("xai/grok-4.6", "Grok 4.6", "xai", "llm", ["xai"]),
	inferenceModel("xai/grok-4.7", "Grok 4.7", "xai", "llm", ["xai"]),
	inferenceModel("zai/glm-5.1", "GLM 5.1", "zai", "llm", ["zai"]),

	// STT — LiveKit Inference
	inferenceModel(
		"assemblyai/universal-3-6-pro",
		"Universal 3.6 Pro",
		"assemblyai",
		"stt",
		["assemblyai"],
	),
	inferenceModel(
		"assemblyai/universal-3-5-pro",
		"Universal 3.5 Pro",
		"assemblyai",
		"stt",
		["assemblyai"],
	),
	inferenceModel(
		"assemblyai/universal-streaming",
		"Universal Streaming",
		"assemblyai",
		"stt",
		["assemblyai"],
	),
	inferenceModel(
		"assemblyai/universal-streaming-multilingual",
		"Universal Streaming Multilingual",
		"assemblyai",
		"stt",
		["assemblyai"],
	),
	inferenceModel(
		"deepgram/flux-general-en",
		"Flux (English)",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel(
		"deepgram/flux-general-multi",
		"Flux (Multilingual)",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel("deepgram/nova-3", "Nova-3", "deepgram", "stt", [
		"deepgram",
	]),
	inferenceModel(
		"deepgram/nova-3-medical",
		"Nova-3 Medical",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel(
		"deepgram/nova-3-pharma",
		"Nova-3 Pharma",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel("deepgram/nova-2", "Nova-2", "deepgram", "stt", [
		"deepgram",
	]),
	inferenceModel(
		"deepgram/nova-2-conversationalai",
		"Nova-2 Conversational AI",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel(
		"deepgram/nova-2-medical",
		"Nova-2 Medical",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel(
		"deepgram/nova-2-phonecall",
		"Nova-2 Phone Call",
		"deepgram",
		"stt",
		["deepgram"],
	),
	inferenceModel("cartesia/ink-2", "Ink 2", "cartesia", "stt", ["cartesia"]),
	inferenceModel("cartesia/ink-whisper", "Ink Whisper", "cartesia", "stt", [
		"cartesia",
	]),
	inferenceModel(
		"google/gemini-3.5-transcribe-live",
		"Gemini 3.5 Transcribe Live",
		"gemini",
		"stt",
		["google"],
		{ variant_group: "gemini-3.5-transcribe-live" },
	),
	inferenceModel(
		"meta/muse-voice-transcribe-1.0",
		"Muse Voice Transcribe 1.0",
		"meta",
		"stt",
		["meta"],
	),
	inferenceModel(
		"openai/gpt-live-transcribe",
		"GPT-Live Transcribe",
		"openai",
		"stt",
		["openai"],
	),
	inferenceModel("speechmatics/linden-1", "Linden-1", "speechmatics", "stt", [
		"speechmatics",
	]),
	inferenceModel("speechmatics/oak-1", "Oak-1", "speechmatics", "stt", [
		"speechmatics",
	]),
	inferenceModel("xai/stt-1", "Speech to Text", "xai", "stt", ["xai"]),
	inferenceModel("xai/stt-2", "Speech to Text 2", "xai", "stt", ["xai"]),

	// TTS — LiveKit Inference
	inferenceModel(
		"assemblyai/assemblyai-tts-1",
		"AssemblyAI TTS 1",
		"assemblyai",
		"tts",
		["assemblyai"],
	),
	inferenceModel("cartesia/sonic-3.6", "Sonic 3.6", "cartesia", "tts", [
		"cartesia",
	]),
	inferenceModel("cartesia/sonic-3.5", "Sonic 3.5", "cartesia", "tts", [
		"cartesia",
	]),
	inferenceModel("cartesia/sonic-3", "Sonic 3", "cartesia", "tts", [
		"cartesia",
	]),
	inferenceModel(
		"cartesia/sonic-3-latest",
		"Sonic 3 Latest",
		"cartesia",
		"tts",
		["cartesia"],
	),
	inferenceModel("cartesia/sonic-latest", "Sonic Latest", "cartesia", "tts", [
		"cartesia",
	]),
	inferenceModel(
		"cartesia/sonic-preview",
		"Sonic Preview",
		"cartesia",
		"tts",
		["cartesia"],
	),
	inferenceModel("deepgram/aura-2", "Aura-2", "deepgram", "tts", [
		"deepgram",
	]),
	inferenceModel("deepgram/flux-tts", "Flux TTS", "deepgram", "tts", [
		"deepgram",
	]),
	inferenceModel("fishaudio/s2.1-pro", "S2.1 Pro", "fishaudio", "tts", [
		"fishaudio",
	]),
	inferenceModel("fishaudio/s2-pro", "S2 Pro", "fishaudio", "tts", [
		"fishaudio",
	]),
	inferenceModel("fishaudio/drama-3", "Drama 3", "fishaudio", "tts", [
		"fishaudio",
	]),
	inferenceModel(
		"google/gemini-3.8-flash-tts",
		"Gemini 3.8 Flash TTS",
		"gemini",
		"tts",
		["google"],
	),
	inferenceModel(
		"google/gemini-3.8-flash-lite-tts",
		"Gemini 3.8 Flash-Lite TTS",
		"gemini",
		"tts",
		["google"],
	),
	inferenceModel("gradium/default", "Gradium TTS", "gradium", "tts", [
		"gradium",
	]),
	inferenceModel(
		"gradium/gradium-tts-beta",
		"Gradium TTS Beta",
		"gradium",
		"tts",
		["gradium"],
	),
	inferenceModel(
		"inworld/inworld-tts-2",
		"Inworld TTS 2",
		"inworld",
		"tts",
		["inworld"],
		{ variant_group: "inworld-tts-2" },
	),
	inferenceModel(
		"inworld/inworld-tts-2-flash",
		"Inworld TTS 2 Flash",
		"inworld",
		"tts",
		["inworld"],
		{ variant_group: "inworld-tts-2-flash" },
	),
	inferenceModel("rime/coda", "Coda", "rime", "tts", ["rime"]),
	inferenceModel("rime/mistv3", "Mist v3", "rime", "tts", ["rime"]),
	inferenceModel("xai/tts-1", "Text to Speech", "xai", "tts", ["xai"]),
];

const OPENAI_VOICES = [
	"alloy",
	"ash",
	"ballad",
	"coral",
	"echo",
	"fable",
	"nova",
	"onyx",
	"sage",
	"shimmer",
	"verse",
	"marin",
	"cedar",
] as const;

const OPENAI_TTS_1_VOICES = [
	"alloy",
	"ash",
	"coral",
	"echo",
	"fable",
	"onyx",
	"nova",
	"sage",
	"shimmer",
] as const;

const GEMINI_VOICES = [
	{ id: "Zephyr", label: "Zephyr (Bright)" },
	{ id: "Puck", label: "Puck (Upbeat)" },
	{ id: "Charon", label: "Charon (Informative)" },
	{ id: "Kore", label: "Kore (Firm)" },
	{ id: "Fenrir", label: "Fenrir (Excitable)" },
	{ id: "Leda", label: "Leda (Youthful)" },
	{ id: "Orus", label: "Orus (Firm)" },
	{ id: "Aoede", label: "Aoede (Breezy)" },
	{ id: "Callirrhoe", label: "Callirrhoe (Easy-going)" },
	{ id: "Autonoe", label: "Autonoe (Bright)" },
	{ id: "Enceladus", label: "Enceladus (Breathy)" },
	{ id: "Iapetus", label: "Iapetus (Clear)" },
	{ id: "Umbriel", label: "Umbriel (Easy-going)" },
	{ id: "Algieba", label: "Algieba (Smooth)" },
	{ id: "Despina", label: "Despina (Smooth)" },
	{ id: "Erinome", label: "Erinome (Clear)" },
	{ id: "Algenib", label: "Algenib (Gravelly)" },
	{ id: "Rasalgethi", label: "Rasalgethi (Informative)" },
	{ id: "Laomedeia", label: "Laomedeia (Upbeat)" },
	{ id: "Achernar", label: "Achernar (Soft)" },
	{ id: "Alnilam", label: "Alnilam (Firm)" },
	{ id: "Schedar", label: "Schedar (Even)" },
	{ id: "Gacrux", label: "Gacrux (Mature)" },
	{ id: "Pulcherrima", label: "Pulcherrima (Forward)" },
	{ id: "Achird", label: "Achird (Friendly)" },
	{ id: "Zubenelgenubi", label: "Zubenelgenubi (Casual)" },
	{ id: "Vindemiatrix", label: "Vindemiatrix (Gentle)" },
	{ id: "Sadachbia", label: "Sadachbia (Lively)" },
	{ id: "Sadaltager", label: "Sadaltager (Knowledgeable)" },
	{ id: "Sulafat", label: "Sulafat (Warm)" },
] as const;

const SARVAM_V3_SPEAKERS = [
	"amelia",
	"ishita",
	"kavitha",
	"kavya",
	"neha",
	"pooja",
	"priya",
	"ritu",
	"roopa",
	"rupali",
	"shruti",
	"shreya",
	"simran",
	"sophia",
	"suhani",
	"tanya",
	"aayan",
	"aditya",
	"advait",
	"amit",
	"ashutosh",
	"dev",
	"kabir",
	"manan",
	"rahul",
	"ratan",
	"rohan",
	"shubh",
	"sumit",
	"varun",
] as const;

const SARVAM_V2_SPEAKERS = [
	"anushka",
	"arya",
	"manisha",
	"vidya",
	"abhilash",
	"hitesh",
	"karun",
] as const;

const INWORLD_VOICES = [
	{ id: "Ashley", label: "Ashley (Warm American female)" },
	{ id: "Diego", label: "Diego (Mexican male)" },
	{ id: "Edward", label: "Edward (American male)" },
	{ id: "Olivia", label: "Olivia (British female)" },
	{ id: "Aarav", label: "Aarav (Indian male)" },
	{ id: "Aanya", label: "Aanya (Indian female)" },
] as const;

const DEEPGRAM_AURA2_VOICES = [
	{ id: "aura-2-thalia-en", label: "Thalia (English)" },
	{ id: "aura-2-andromeda-en", label: "Andromeda (English)" },
	{ id: "aura-2-helena-en", label: "Helena (English)" },
	{ id: "aura-2-apollo-en", label: "Apollo (English)" },
	{ id: "aura-2-arcas-en", label: "Arcas (English)" },
	{ id: "aura-2-zeus-en", label: "Zeus (English)" },
] as const;

const RIME_CODA_VOICES = [
	{ id: "lyra", label: "Lyra" },
	{ id: "astra", label: "Astra" },
	{ id: "celeste", label: "Celeste" },
] as const;

const RIME_MIST_VOICES = [
	{ id: "cove", label: "Cove" },
	{ id: "lake", label: "Lake" },
] as const;

/** Sample Cartesia voice UUIDs from the Cartesia library (paste more via Custom). */
const CARTESIA_VOICES = [
	{
		id: "a0e99841-438c-4a64-b679-ae501e7d6091",
		label: "Katie (Conversational)",
	},
	{
		id: "794f9389-aac1-45b6-b726-9d9369183238",
		label: "Sarah (News)",
	},
] as const;

const FISHAUDIO_VOICES = [
	{
		id: "fa4c9eb3dccc4806b382b40d61c6b10a",
		label: "Default (Fish Audio)",
	},
] as const;

const OPENAI_REALTIME_VOICES = [
	"alloy",
	"ash",
	"ballad",
	"coral",
	"echo",
	"sage",
	"shimmer",
	"verse",
	"marin",
	"cedar",
] as const;

const OPENAI_LIVE_VOICES = [
	{ id: "marin", label: "Marin" },
	{ id: "quartz", label: "Quartz (Australian feminine)" },
	{ id: "ripple", label: "Ripple (Australian masculine)" },
	{ id: "vesper", label: "Vesper (British masculine)" },
	{ id: "willow", label: "Willow (Irish feminine)" },
	{ id: "stone", label: "Stone (Irish masculine)" },
	{ id: "gleam", label: "Gleam (North American feminine)" },
	{ id: "meridian", label: "Meridian (North American masculine)" },
	{ id: "bossa", label: "Bossa (Brazilian Portuguese feminine)" },
	{ id: "tempo", label: "Tempo (Brazilian Portuguese masculine)" },
	{ id: "beacon", label: "Beacon (Filipino masculine)" },
	{ id: "delta", label: "Delta (Southern U.S. feminine)" },
	{ id: "cinder", label: "Cinder (Southern U.S. masculine)" },
] as const;

function voicesFor(
	providerModelId: string,
	voices: readonly string[] | readonly { id: string; label: string }[],
): CatalogVoice[] {
	return voices.map((voice) => {
		const voiceId = typeof voice === "string" ? voice : voice.id;
		const label =
			typeof voice === "string"
				? voice.charAt(0).toUpperCase() + voice.slice(1)
				: voice.label;
		return {
			id: `${providerModelId}:${voiceId}`,
			voice_id: voiceId,
			label,
			provider_model_id: providerModelId,
			preview_url: null,
		};
	});
}

export const CATALOG_VOICES: CatalogVoice[] = [
	...voicesFor("gpt-4o-mini-tts", OPENAI_VOICES),
	...voicesFor("tts-1", OPENAI_TTS_1_VOICES),
	...voicesFor("tts-1-hd", OPENAI_TTS_1_VOICES),
	...voicesFor("gpt-realtime-2.1", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-realtime-2.1-mini", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-realtime-2", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-realtime-1.5", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-realtime", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-realtime-mini", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-4o-realtime-preview", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-4o-mini-realtime-preview", OPENAI_REALTIME_VOICES),
	...voicesFor("gpt-live-1", OPENAI_LIVE_VOICES),
	...voicesFor("gemini-3.1-flash-tts-preview", GEMINI_VOICES),
	...voicesFor("gemini-2.5-flash-preview-tts", GEMINI_VOICES),
	...voicesFor("gemini-2.5-pro-preview-tts", GEMINI_VOICES),
	...voicesFor("gemini-3.1-flash-live-preview", GEMINI_VOICES),
	...voicesFor(
		"gemini-2.5-flash-native-audio-preview-12-2025",
		GEMINI_VOICES,
	),
	...voicesFor("gemini-3.8-live", GEMINI_VOICES),
	...voicesFor("gemini-3.8-live-extended-thinking", GEMINI_VOICES),
	...voicesFor("sarvam:bulbul:v3", SARVAM_V3_SPEAKERS),
	...voicesFor("sarvam:bulbul:v2", SARVAM_V2_SPEAKERS),
	...voicesFor("inworld-tts-1.5-max", INWORLD_VOICES),
	...voicesFor("inworld-tts-1.5-mini", INWORLD_VOICES),
	...voicesFor("inworld-tts-2", INWORLD_VOICES),
	...voicesFor("inworld-tts-2-flash", INWORLD_VOICES),
	...voicesFor("inworld/inworld-tts-2", INWORLD_VOICES),
	...voicesFor("inworld/inworld-tts-2-flash", INWORLD_VOICES),
	...voicesFor("deepgram/aura-2", DEEPGRAM_AURA2_VOICES),
	...voicesFor("rime/coda", RIME_CODA_VOICES),
	...voicesFor("rime/mistv3", RIME_MIST_VOICES),
	...voicesFor("cartesia/sonic-3.6", CARTESIA_VOICES),
	...voicesFor("cartesia/sonic-3.5", CARTESIA_VOICES),
	...voicesFor("cartesia/sonic-3", CARTESIA_VOICES),
	...voicesFor("cartesia/sonic-3-latest", CARTESIA_VOICES),
	...voicesFor("cartesia/sonic-latest", CARTESIA_VOICES),
	...voicesFor("cartesia/sonic-preview", CARTESIA_VOICES),
	...voicesFor("fishaudio/s2.1-pro", FISHAUDIO_VOICES),
	...voicesFor("fishaudio/s2-pro", FISHAUDIO_VOICES),
	...voicesFor("fishaudio/drama-3", FISHAUDIO_VOICES),
	...voicesFor("google/gemini-3.8-flash-tts", GEMINI_VOICES),
	...voicesFor("google/gemini-3.8-flash-lite-tts", GEMINI_VOICES),
];

export const CATALOG_AUDIO_CLIPS: CatalogAudioClip[] = [
	{
		id: "office_ambience",
		label: "Office ambience",
		description:
			"Busy office chatter and background noise (LiveKit default).",
		builtin: true,
	},
	{
		id: "keyboard_typing",
		label: "Keyboard typing",
		description: "Close-mic keyboard typing (LiveKit default).",
		builtin: true,
	},
	{
		id: "keyboard_typing2",
		label: "Keyboard typing (short)",
		description: "Shorter keyboard typing clip (LiveKit default).",
		builtin: true,
	},
	{
		id: "custom",
		label: "Custom URL",
		description: "Provide your own audio file URL.",
		builtin: false,
	},
];

export const CATALOG_LANGUAGES = [
	{ value: "en", label: "English" },
	{ value: "en-US", label: "English (US)" },
	{ value: "en-GB", label: "English (UK)" },
	{ value: "en-IN", label: "English (India)" },
	{ value: "hi", label: "Hindi" },
	{ value: "hi-IN", label: "Hindi (India)" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "de", label: "German" },
	{ value: "pt", label: "Portuguese" },
	{ value: "ja", label: "Japanese" },
	{ value: "ko", label: "Korean" },
	{ value: "zh", label: "Chinese" },
];

export const CATALOG_TIMEZONES = [
	{ value: "UTC", label: "UTC" },
	{ value: "America/New_York", label: "America/New_York" },
	{ value: "America/Los_Angeles", label: "America/Los_Angeles" },
	{ value: "Europe/London", label: "Europe/London" },
	{ value: "Europe/Paris", label: "Europe/Paris" },
	{ value: "Asia/Kolkata", label: "Asia/Kolkata" },
	{ value: "Asia/Dubai", label: "Asia/Dubai" },
	{ value: "Asia/Singapore", label: "Asia/Singapore" },
	{ value: "Asia/Tokyo", label: "Asia/Tokyo" },
	{ value: "Australia/Sydney", label: "Australia/Sydney" },
];

export const AVATARS_PROVIDERS: {
	id: string;
	display_name: string;
	avatars: AvatarModel[];
}[] = [
	{
		id: "anam",
		display_name: "Anam",
		avatars: [
			{
				id: "5f46f99e-c4be-4f22-bde2-b364975a0851",
				display_name: "Sanjay",
			},
			{
				id: "d3e94c42-b348-4bec-8225-e47a682128a0",
				display_name: "Samira",
			},
		],
	},
	{
		id: "spatialreal",
		display_name: "SpatialReal",
		avatars: [
			{
				id: "6aed28f9-674c-4ffb-89ee-b447b28aa3ed",
				display_name: "Raj",
			},
			{
				id: "4b119100-4e6d-44bd-a0f8-bc1abc4382ee",
				display_name: "Arjun",
			},
			{
				id: "3c409ac5-2637-4dd6-9c0c-c47c4b085966",
				display_name: "Sanjay",
			},
			{
				id: "a0a234f5-0e04-483c-9cf1-3d5bd88b4442",
				display_name: "Samira",
			},
		],
	},
	{
		id: "spatius",
		display_name: "Spatius",
		avatars: [
			{
				id: "e06640cb-e011-4806-bd3e-6b07575eff2e",
				display_name: "Samir",
			},
			{
				id: "9078fde3-8e55-4311-a8d6-7740185b5b0d",
				display_name: "Nadia",
			},
			{
				id: "f0c7f7b2-2f47-4622-bc3f-4b54c0904fb9",
				display_name: "Sanjay",
			},
			{
				id: "51e90053-f1b1-4b12-92d0-5dc1615c25cf",
				display_name: "Raj",
			},
		],
	},
	{
		id: "arkit",
		display_name: "OptiModel",
		avatars: [
			{
				id: "samira",
				display_name: "Samira",
			},
			{
				id: "sanjay",
				display_name: "Sanjay",
			},
		],
	},
];

export type CatalogProvider = {
	id: string;
	display_name: string;
};

export type CatalogModel = {
	id: string;
	display_name: string;
	provider_id: string;
	is_enabled: boolean;
	delivery_mode: "hosted" | "byok";
	kind: "llm" | "realtime" | "stt" | "tts";
	supports_text_output?: boolean;
};

export type CatalogVoice = {
	id: string;
	voice_id: string;
	label: string;
	preview_url?: string | null;
	provider_model_id: string;
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
	{ id: "sarvam", display_name: "Sarvam" },
	{ id: "inworld", display_name: "Inworld" },
];

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
		delivery_mode: "hosted",
		kind,
		...extra,
	};
}

export const CATALOG_MODELS: CatalogModel[] = [
	// LLM — OpenAI
	model("chat-latest", "ChatGPT Latest", "openai", "llm"),
	model("gpt-4.1", "GPT-4.1", "openai", "llm"),
	model("gpt-4.1-mini", "GPT-4.1 Mini", "openai", "llm"),
	model("gpt-4.1-nano", "GPT-4.1 Nano", "openai", "llm"),
	model("gpt-4o", "GPT-4o", "openai", "llm"),
	model("gpt-4o-mini", "GPT-4o Mini", "openai", "llm"),
	model("gpt-5", "GPT-5", "openai", "llm"),
	model("gpt-5-mini", "GPT-5 Mini", "openai", "llm"),
	model("gpt-5-nano", "GPT-5 Nano", "openai", "llm"),
	model("gpt-5.1", "GPT-5.1", "openai", "llm"),
	model("gpt-5.2", "GPT-5.2", "openai", "llm"),
	model("gpt-5.4", "GPT-5.4", "openai", "llm"),
	model("gpt-5.4-mini", "GPT-5.4 Mini", "openai", "llm"),
	model("gpt-5.4-nano", "GPT-5.4 Nano", "openai", "llm"),
	model("gpt-5.5", "GPT-5.5", "openai", "llm"),
	model("gpt-5.6-luna", "GPT-5.6 Luna", "openai", "llm"),
	model("gpt-5.6-sol", "GPT-5.6 Sol", "openai", "llm"),
	model("gpt-5.6-terra", "GPT-5.6 Terra", "openai", "llm"),

	// LLM — Gemini
	model("gemini-3-flash-preview", "Gemini 3 Flash", "gemini", "llm"),
	model("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "gemini", "llm"),
	model("gemini-3.1-pro-preview", "Gemini 3.1 Pro", "gemini", "llm"),
	model("gemini-3.5-flash", "Gemini 3.5 Flash", "gemini", "llm"),
	model("gemini-3.5-flash-lite", "Gemini 3.5 Flash Lite", "gemini", "llm"),
	model("gemini-3.6-flash", "Gemini 3.6 Flash", "gemini", "llm"),
	model("gemini-3.7-flash", "Gemini 3.7 Flash", "gemini", "llm"),
	model("gemini-3.8-flash", "Gemini 3.8 Flash", "gemini", "llm"),

	// Realtime
	model("gpt-realtime", "GPT Realtime", "openai", "realtime", {
		supports_text_output: true,
	}),
	model("gemini-live", "Gemini Live", "gemini", "realtime", {
		supports_text_output: false,
	}),

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
	),
	model("gemini-3.5-flash", "Gemini 3.5 Flash STT", "gemini", "stt"),
	model("gemini-3-flash-preview", "Gemini 3 Flash STT", "gemini", "stt"),
	model("gemini-3-pro-preview", "Gemini 3 Pro STT", "gemini", "stt"),
	model("gemini-2.5-flash", "Gemini 2.5 Flash STT", "gemini", "stt"),

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

	// TTS — Inworld
	model("inworld-tts-1.5-max", "Inworld TTS 1.5 Max", "inworld", "tts"),
	model("inworld-tts-1.5-mini", "Inworld TTS 1.5 Mini", "inworld", "tts"),
	model("inworld-tts-2", "Inworld TTS 2", "inworld", "tts"),
	model("inworld-tts-2-flash", "Inworld TTS 2 Flash", "inworld", "tts"),
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
	...voicesFor("gpt-realtime", OPENAI_REALTIME_VOICES),
	...voicesFor("gemini-3.1-flash-tts-preview", GEMINI_VOICES),
	...voicesFor("gemini-2.5-flash-preview-tts", GEMINI_VOICES),
	...voicesFor("gemini-2.5-pro-preview-tts", GEMINI_VOICES),
	...voicesFor("gemini-live", GEMINI_VOICES),
	...voicesFor("sarvam:bulbul:v3", SARVAM_V3_SPEAKERS),
	...voicesFor("sarvam:bulbul:v2", SARVAM_V2_SPEAKERS),
	...voicesFor("inworld-tts-1.5-max", INWORLD_VOICES),
	...voicesFor("inworld-tts-1.5-mini", INWORLD_VOICES),
	...voicesFor("inworld-tts-2", INWORLD_VOICES),
	...voicesFor("inworld-tts-2-flash", INWORLD_VOICES),
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
	{ value: "hi", label: "Hindi" },
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

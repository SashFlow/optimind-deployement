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

export const CATALOG_PROVIDERS: CatalogProvider[] = [
	{ id: "openai", display_name: "OpenAI" },
	{ id: "gemini", display_name: "Google Gemini" },
	{ id: "deepgram", display_name: "Deepgram" },
	{ id: "elevenlabs", display_name: "ElevenLabs" },
	{ id: "cartesia", display_name: "Cartesia" },
	{ id: "sarvam", display_name: "Sarvam" },
	{ id: "inworld", display_name: "Inworld" },
];

export const CATALOG_MODELS: CatalogModel[] = [
	{
		id: "openai:gpt-4.1",
		display_name: "GPT-4.1",
		provider_id: "openai",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "llm",
	},
	{
		id: "openai:gpt-4.1-mini",
		display_name: "GPT-4.1 Mini",
		provider_id: "openai",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "llm",
	},
	{
		id: "gemini:gemini-2.5-flash",
		display_name: "Gemini 2.5 Flash",
		provider_id: "gemini",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "llm",
	},
	{
		id: "openai:gpt-realtime",
		display_name: "GPT Realtime",
		provider_id: "openai",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "realtime",
		supports_text_output: true,
	},
	{
		id: "gemini:gemini-live",
		display_name: "Gemini Live",
		provider_id: "gemini",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "realtime",
		supports_text_output: false,
	},
	{
		id: "deepgram:nova-3",
		display_name: "Nova 3",
		provider_id: "deepgram",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "stt",
	},
	{
		id: "openai:whisper-1",
		display_name: "Whisper",
		provider_id: "openai",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "stt",
	},
	{
		id: "sarvam:saarika",
		display_name: "Saarika",
		provider_id: "sarvam",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "stt",
	},
	{
		id: "elevenlabs:eleven_multilingual_v2",
		display_name: "Multilingual v2",
		provider_id: "elevenlabs",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "tts",
	},
	{
		id: "cartesia:sonic-2",
		display_name: "Sonic 2",
		provider_id: "cartesia",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "tts",
	},
	{
		id: "openai:gpt-4o-mini-tts",
		display_name: "GPT-4o Mini TTS",
		provider_id: "openai",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "tts",
	},
	{
		id: "inworld:tts-1",
		display_name: "Inworld TTS",
		provider_id: "inworld",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "tts",
	},
	{
		id: "sarvam:bulbul",
		display_name: "Bulbul",
		provider_id: "sarvam",
		is_enabled: true,
		delivery_mode: "hosted",
		kind: "tts",
	},
];

export const CATALOG_VOICES: CatalogVoice[] = [
	{
		id: "el-rachel",
		voice_id: "rachel",
		label: "Rachel",
		provider_model_id: "elevenlabs:eleven_multilingual_v2",
		preview_url: null,
	},
	{
		id: "el-adam",
		voice_id: "adam",
		label: "Adam",
		provider_model_id: "elevenlabs:eleven_multilingual_v2",
		preview_url: null,
	},
	{
		id: "cartesia-katie",
		voice_id: "katie",
		label: "Katie",
		provider_model_id: "cartesia:sonic-2",
		preview_url: null,
	},
	{
		id: "openai-alloy",
		voice_id: "alloy",
		label: "Alloy",
		provider_model_id: "openai:gpt-4o-mini-tts",
		preview_url: null,
	},
	{
		id: "openai-verse",
		voice_id: "verse",
		label: "Verse",
		provider_model_id: "openai:gpt-realtime",
		preview_url: null,
	},
	{
		id: "openai-alloy-rt",
		voice_id: "alloy",
		label: "Alloy",
		provider_model_id: "openai:gpt-realtime",
		preview_url: null,
	},
	{
		id: "sarvam-meera",
		voice_id: "meera",
		label: "Meera",
		provider_model_id: "sarvam:bulbul",
		preview_url: null,
	},
	{
		id: "inworld-default",
		voice_id: "default",
		label: "Default",
		provider_model_id: "inworld:tts-1",
		preview_url: null,
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

export type GreetingConfig = {
	enabled: boolean;
	text: string;
	trigger: "on_join" | "on_first_speech" | "manual";
	interruptible: boolean;
};

export type ModelRef = {
	provider_model_id?: string | null;
	model_id?: string | null;
	params?: Record<string, unknown>;
};

export type TtsRef = ModelRef & {
	voice_id?: string | null;
	speed?: number | null;
};

export type RealtimeRef = {
	provider_model_id?: string | null;
	model_id?: string | null;
	voice_id?: string | null;
	output_modality?: "audio" | "text";
	params?: Record<string, unknown>;
};

export type AvatarRef = {
	enabled: boolean;
	org_avatar_id?: string | null;
	provider_id?: string | null;
	external_avatar_id?: string | null;
	params?: Record<string, unknown>;
};

export type TurnDetectionConfig = {
	mode: "vad" | "stt" | "manual" | "realtime_multimodal";
	params?: Record<string, unknown>;
};

export type LanguageConfig = {
	primary: string | null;
	secondary: string | null;
};

export type ExpressiveSpeechConfig = {
	enabled: boolean;
	intensity: number;
};

export type ToolCallAudioConfig = {
	enabled: boolean;
	url: string;
	volume: number;
};

export type VoicemailConfig = {
	detection_enabled: boolean;
	leave_message_enabled: boolean;
	retry_call_enabled: boolean;
};

export type InterruptionSensitivityConfig = {
	mode: "sensitive" | "default" | "strict";
};

export type NoiseFilteringConfig = {
	enabled: boolean;
	suppression_level: number;
};

export type OtherSettingsConfig = {
	silence_callee_when_speaking: boolean;
	enable_graceful_exit_warning: boolean;
};

export type KeywordBoostingConfig = {
	keywords: string[];
};

export type ToolsByPhaseConfig = {
	pre_call: string[];
	on_call: string[];
	post_call: string[];
};

export type PromptSections = {
	identity: string;
	output_rules: string;
	tools: string;
	goal: string;
	guardrails: string;
	user_information: string;
	pauses_and_filler_words: string;
	self_corrections: string;
	emotion: string;
	non_verbal_sounds: string;
	personality: string;
	phrase_variation: string;
};

export type DataCollectionField = {
	key: string;
	label: string;
	description: string;
	field_type: "string" | "number" | "boolean" | "enum";
	required: boolean;
	options: string[];
};

export type AgentVariableDefinition = {
	name: string;
	variable_type: "link" | "text" | "number" | "file";
	required: boolean;
};

export type AgentConfigDocument = {
	instructions: string;
	greeting: GreetingConfig;
	pipeline_mode: "cascaded" | "realtime";
	llm: ModelRef | null;
	realtime: RealtimeRef | null;
	stt: ModelRef | null;
	tts: TtsRef | null;
	avatar: AvatarRef | null;
	turn_detection: TurnDetectionConfig | null;
	language: LanguageConfig;
	voicemail: VoicemailConfig;
	interruption_sensitivity: InterruptionSensitivityConfig;
	noise_filtering: NoiseFilteringConfig;
	other_settings: OtherSettingsConfig;
	keyword_boosting: KeywordBoostingConfig;
	expressive_speech: ExpressiveSpeechConfig;
	tool_call_audio: ToolCallAudioConfig;
	tools_by_phase: ToolsByPhaseConfig;
	knowledge_base_ids: string[];
	variables: AgentVariableDefinition[];
	environment_variables: Record<string, string>;
	prompts: PromptSections;
	background_audio: {
		enabled: boolean;
		url: string;
		volume: number;
	};
	ssml_enabled: boolean;
	data_collection_fields: DataCollectionField[];
	call_ending: {
		enabled: boolean;
		farewell_message: string;
		max_duration_seconds: number | null;
		end_on_silence_seconds: number | null;
		inactivity_warning_seconds: number | null;
		inactivity_end_seconds: number | null;
		timezone: string;
	};
	tools: string[];
	tools_config: {
		end_call: boolean;
		reschedule: boolean;
		transfer_call: boolean;
		api_tools: boolean;
		widget_tools: boolean;
		knowledge_search: boolean;
	};
	before_session_start: {
		enabled: boolean;
		webhook_url: string;
		script: string;
		timeout_seconds: number;
	};
	mcp: {
		enabled: boolean;
		servers: {
			name: string;
			url: string;
			auth_token: string;
			tool_ids: string[];
		}[];
	};
	metadata: Record<string, unknown>;
	recording_enabled: boolean;
};

export const defaultPromptSections: PromptSections = {
	identity: "",
	output_rules: "",
	tools: "",
	goal: "",
	guardrails: "",
	user_information: "",
	pauses_and_filler_words: `After every standalone "um", insert <break time="300ms"/> immediately and follow up with "so."`,
	self_corrections:
		"When a better phrasing comes to mind mid-sentence, drop the first version and restart.",
	emotion:
		"Default to a calm, peaceful baseline. Use stronger emotions sparingly.",
	non_verbal_sounds: "Use these sparingly, no more than one per turn.",
	personality: "You carry a steady, positive energy. Relaxed, not syrupy.",
	phrase_variation: `Don't open consecutive turns with the same word or acknowledgment.`,
};

export function syncToolsFromPhases(
	toolsByPhase: ToolsByPhaseConfig,
): string[] {
	return [
		...new Set([
			...toolsByPhase.pre_call,
			...toolsByPhase.on_call,
			...toolsByPhase.post_call,
		]),
	];
}

export function createDefaultAgentConfig(): AgentConfigDocument {
	return {
		instructions: "",
		greeting: {
			enabled: true,
			text: "",
			trigger: "on_join",
			interruptible: true,
		},
		pipeline_mode: "cascaded",
		llm: null,
		realtime: null,
		stt: null,
		tts: null,
		avatar: { enabled: false, params: {} },
		turn_detection: { mode: "vad", params: {} },
		language: { primary: null, secondary: null },
		voicemail: {
			detection_enabled: false,
			leave_message_enabled: false,
			retry_call_enabled: false,
		},
		interruption_sensitivity: { mode: "default" },
		noise_filtering: { enabled: false, suppression_level: 80 },
		other_settings: {
			silence_callee_when_speaking: false,
			enable_graceful_exit_warning: false,
		},
		keyword_boosting: { keywords: [] },
		expressive_speech: { enabled: false, intensity: 0.5 },
		tool_call_audio: { enabled: false, url: "", volume: 0.5 },
		tools_by_phase: { pre_call: [], on_call: [], post_call: [] },
		knowledge_base_ids: [],
		variables: [],
		environment_variables: {},
		prompts: { ...defaultPromptSections },
		background_audio: { enabled: false, url: "", volume: 0.5 },
		ssml_enabled: false,
		data_collection_fields: [],
		call_ending: {
			enabled: true,
			farewell_message: "",
			max_duration_seconds: null,
			end_on_silence_seconds: null,
			inactivity_warning_seconds: null,
			inactivity_end_seconds: null,
			timezone: "Asia/Kolkata",
		},
		tools: [],
		tools_config: {
			end_call: true,
			reschedule: false,
			transfer_call: false,
			api_tools: true,
			widget_tools: false,
			knowledge_search: false,
		},
		before_session_start: {
			enabled: false,
			webhook_url: "",
			script: "",
			timeout_seconds: 30,
		},
		mcp: { enabled: false, servers: [] },
		metadata: {},
		recording_enabled: false,
	};
}

export function normalizeVariables(raw: unknown): AgentVariableDefinition[] {
	if (Array.isArray(raw)) {
		return raw
			.map((item) => {
				const v = item as Partial<AgentVariableDefinition>;
				return {
					name: v.name ?? "",
					variable_type: v.variable_type ?? "text",
					required: v.required ?? false,
				};
			})
			.filter((item) => item.name.trim());
	}
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return Object.keys(raw as Record<string, string>).map((name) => ({
			name,
			variable_type: "text" as const,
			required: false,
		}));
	}
	return [];
}

export function normalizeAgentConfig(
	config: Record<string, unknown> | AgentConfigDocument | undefined,
): AgentConfigDocument {
	const defaults = createDefaultAgentConfig();
	if (!config) return defaults;
	const c = config as Partial<AgentConfigDocument>;
	const toolsByPhase = {
		...defaults.tools_by_phase,
		...(c.tools_by_phase ?? {}),
	};
	return {
		...defaults,
		...c,
		greeting: { ...defaults.greeting, ...(c.greeting ?? {}) },
		prompts: { ...defaults.prompts, ...(c.prompts ?? {}) },
		background_audio: {
			...defaults.background_audio,
			...(c.background_audio ?? {}),
		},
		call_ending: { ...defaults.call_ending, ...(c.call_ending ?? {}) },
		tools_config: { ...defaults.tools_config, ...(c.tools_config ?? {}) },
		before_session_start: {
			...defaults.before_session_start,
			...(c.before_session_start ?? {}),
		},
		language: { ...defaults.language, ...(c.language ?? {}) },
		voicemail: { ...defaults.voicemail, ...(c.voicemail ?? {}) },
		interruption_sensitivity: {
			...defaults.interruption_sensitivity,
			...(c.interruption_sensitivity ?? {}),
		},
		noise_filtering: {
			...defaults.noise_filtering,
			...(c.noise_filtering ?? {}),
		},
		other_settings: {
			...defaults.other_settings,
			...(c.other_settings ?? {}),
		},
		keyword_boosting: {
			...defaults.keyword_boosting,
			...(c.keyword_boosting ?? {}),
			keywords:
				c.keyword_boosting?.keywords ??
				defaults.keyword_boosting.keywords,
		},
		expressive_speech: {
			...defaults.expressive_speech,
			...(c.expressive_speech ?? {}),
		},
		tool_call_audio: {
			...defaults.tool_call_audio,
			...(c.tool_call_audio ?? {}),
		},
		tools_by_phase: toolsByPhase,
		knowledge_base_ids: c.knowledge_base_ids ?? defaults.knowledge_base_ids,
		turn_detection: c.turn_detection
			? { ...defaults.turn_detection!, ...c.turn_detection }
			: defaults.turn_detection,
		realtime: c.realtime
			? { output_modality: "audio", ...c.realtime }
			: defaults.realtime,
		mcp: {
			...defaults.mcp,
			...(c.mcp ?? {}),
			servers: c.mcp?.servers ?? defaults.mcp.servers,
		},
		avatar: {
			enabled: c.avatar?.enabled ?? defaults.avatar?.enabled ?? false,
			org_avatar_id:
				c.avatar?.org_avatar_id ??
				defaults.avatar?.org_avatar_id ??
				null,
			provider_id:
				c.avatar?.provider_id ?? defaults.avatar?.provider_id ?? null,
			external_avatar_id:
				c.avatar?.external_avatar_id ??
				defaults.avatar?.external_avatar_id ??
				null,
			params: c.avatar?.params ?? defaults.avatar?.params ?? {},
		},
		variables: normalizeVariables(c.variables),
		environment_variables:
			c.environment_variables ?? defaults.environment_variables,
		data_collection_fields:
			c.data_collection_fields ?? defaults.data_collection_fields,
		tools: c.tools ?? syncToolsFromPhases(toolsByPhase),
		metadata: c.metadata ?? defaults.metadata,
		recording_enabled: c.recording_enabled ?? defaults.recording_enabled,
	};
}

import { z } from "zod";
import { CATALOG_MODELS } from "../../catalog/data";

const modelRefSchema = z
	.object({
		provider_model_id: z.string().nullable().optional(),
		model_id: z.string().nullable().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

const ttsRefSchema = modelRefSchema
	.extend({
		voice_id: z.string().nullable().optional(),
		speed: z.number().nullable().optional(),
	})
	.passthrough();

const realtimeRefSchema = z
	.object({
		provider_model_id: z.string().nullable().optional(),
		model_id: z.string().nullable().optional(),
		voice_id: z.string().nullable().optional(),
		output_modality: z.enum(["audio", "text"]).optional(),
		params: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

const liveRefSchema = z
	.object({
		provider_model_id: z.string().nullable().optional(),
		model_id: z.string().nullable().optional(),
		voice_id: z.string().nullable().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

const audioClipSchema = z.enum([
	"office_ambience",
	"keyboard_typing",
	"keyboard_typing2",
	"custom",
]);

const audioConfigSchema = z
	.object({
		enabled: z.boolean(),
		clip: audioClipSchema.optional(),
		url: z.string(),
		volume: z.number(),
	})
	.passthrough();

export const agentConfigSchema = z
	.object({
		instructions: z.string().optional(),
		greeting: z
			.object({
				enabled: z.boolean(),
				text: z.string(),
				trigger: z.enum(["on_join", "on_first_speech", "manual"]),
				interruptible: z.boolean(),
			})
			.passthrough()
			.optional(),
		pipeline_mode: z.enum(["cascaded", "realtime", "live"]).optional(),
		llm: modelRefSchema.nullable().optional(),
		realtime: realtimeRefSchema.nullable().optional(),
		live: liveRefSchema.nullable().optional(),
		stt: modelRefSchema.nullable().optional(),
		tts: ttsRefSchema.nullable().optional(),
		avatar: z
			.object({
				enabled: z.boolean(),
				org_avatar_id: z.string().nullable().optional(),
				provider_id: z.string().nullable().optional(),
				external_avatar_id: z.string().nullable().optional(),
				params: z.record(z.string(), z.unknown()).optional(),
			})
			.passthrough()
			.nullable()
			.optional(),
		turn_detection: z
			.object({
				mode: z.enum(["vad", "stt", "manual", "realtime_multimodal"]),
				params: z.record(z.string(), z.unknown()).optional(),
			})
			.passthrough()
			.nullable()
			.optional(),
		language: z
			.object({
				primary: z.string().nullable(),
				secondary: z.string().nullable(),
			})
			.passthrough()
			.optional(),
		voicemail: z
			.object({
				detection_enabled: z.boolean(),
				leave_message_enabled: z.boolean(),
				message: z.string().optional(),
				retry_call_enabled: z.boolean(),
				retry_after_hours: z.number().nullable().optional(),
			})
			.passthrough()
			.superRefine((value, ctx) => {
				if (
					value.leave_message_enabled &&
					!(value.message ?? "").trim()
				) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							"Voicemail message is required when leave message is enabled",
						path: ["message"],
					});
				}
				if (
					value.retry_call_enabled &&
					(value.retry_after_hours == null ||
						!Number.isFinite(value.retry_after_hours) ||
						value.retry_after_hours <= 0)
				) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							"retry_after_hours is required when retry call is enabled",
						path: ["retry_after_hours"],
					});
				}
			})
			.optional(),
		interruption_sensitivity: z
			.object({
				mode: z.enum(["sensitive", "default", "strict"]),
			})
			.passthrough()
			.optional(),
		noise_filtering: z
			.object({
				enabled: z.boolean(),
				suppression_level: z.number(),
			})
			.passthrough()
			.optional(),
		other_settings: z
			.object({
				silence_callee_when_speaking: z.boolean(),
				enable_graceful_exit_warning: z.boolean(),
			})
			.passthrough()
			.optional(),
		keyword_boosting: z
			.object({
				keywords: z.array(z.string()),
			})
			.passthrough()
			.optional(),
		expressive_speech: z
			.object({
				enabled: z.boolean(),
				intensity: z.number(),
			})
			.passthrough()
			.optional(),
		tool_call_audio: audioConfigSchema.optional(),
		tools_by_phase: z
			.object({
				pre_call: z.array(z.string()),
				on_call: z.array(z.string()),
				post_call: z.array(z.string()),
			})
			.passthrough()
			.optional(),
		knowledge_base_ids: z.array(z.string()).optional(),
		variables: z
			.array(
				z
					.object({
						name: z.string(),
						variable_type: z.enum([
							"link",
							"text",
							"number",
							"file",
						]),
						required: z.boolean(),
					})
					.passthrough(),
			)
			.optional(),
		environment_variables: z.record(z.string(), z.string()).optional(),
		prompts: z.record(z.string(), z.string()).optional(),
		background_audio: audioConfigSchema.optional(),
		ssml_enabled: z.boolean().optional(),
		data_collection_fields: z
			.array(
				z
					.object({
						key: z.string(),
						label: z.string(),
						description: z.string(),
						field_type: z.enum([
							"string",
							"number",
							"boolean",
							"enum",
						]),
						required: z.boolean(),
						options: z.array(z.string()),
					})
					.passthrough(),
			)
			.optional(),
		call_ending: z
			.object({
				enabled: z.boolean(),
				farewell_message: z.string(),
				max_duration_seconds: z.number().nullable(),
				end_on_silence_seconds: z.number().nullable(),
				inactivity_warning_seconds: z.number().nullable(),
				inactivity_end_seconds: z.number().nullable(),
				timezone: z.string(),
			})
			.passthrough()
			.optional(),
		tools: z.array(z.string()).optional(),
		tools_config: z
			.object({
				end_call: z.boolean(),
				reschedule: z.boolean(),
				transfer_call: z.boolean(),
				api_tools: z.boolean(),
				widget_tools: z.boolean(),
				knowledge_search: z.boolean(),
				web_search: z.boolean().optional().default(false),
			})
			.passthrough()
			.optional(),
		before_session_start: z
			.object({
				enabled: z.boolean(),
				webhook_url: z.string(),
				script: z.string(),
				timeout_seconds: z.number(),
			})
			.passthrough()
			.optional(),
		mcp: z
			.object({
				enabled: z.boolean(),
				servers: z.array(
					z
						.object({
							name: z.string(),
							url: z.string(),
							auth_token: z.string(),
							tool_ids: z.array(z.string()),
						})
						.passthrough(),
				),
			})
			.passthrough()
			.optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
		recording_enabled: z.boolean().optional(),
	})
	.passthrough()
	.superRefine((value, ctx) => {
		if (value.pipeline_mode !== "live") {
			return;
		}

		const liveModelId =
			value.live?.provider_model_id?.trim() ||
			value.live?.model_id?.trim() ||
			"";
		const reasoningModelId =
			value.llm?.provider_model_id?.trim() ||
			value.llm?.model_id?.trim() ||
			"";

		if (!liveModelId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Live pipeline requires a live model",
				path: ["live", "provider_model_id"],
			});
		}
		if (!reasoningModelId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Live pipeline requires a reasoning model",
				path: ["llm", "provider_model_id"],
			});
		}
		if (!liveModelId || !reasoningModelId) {
			return;
		}

		const liveModel = CATALOG_MODELS.find(
			(model) => model.id === liveModelId && model.kind === "live",
		);
		const reasoningModel = CATALOG_MODELS.find(
			(model) => model.id === reasoningModelId && model.kind === "llm",
		);

		if (!liveModel) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Unknown live model: ${liveModelId}`,
				path: ["live", "provider_model_id"],
			});
			return;
		}
		if (!reasoningModel) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Unknown reasoning model: ${reasoningModelId}`,
				path: ["llm", "provider_model_id"],
			});
			return;
		}
		if (liveModel.provider_id !== reasoningModel.provider_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Live model and reasoning model must use the same provider",
				path: ["llm", "provider_model_id"],
			});
		}
	});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

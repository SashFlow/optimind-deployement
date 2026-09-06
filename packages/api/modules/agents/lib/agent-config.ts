import { z } from "zod";

export const agentConfigSchema = z
	.object({
		llm: z
			.object({
				provider: z.enum(["openai", "gemini"]),
				model: z.string(),
				temperature: z.number().min(0).max(2).optional(),
			})
			.optional(),
		stt: z
			.object({
				provider: z.enum(["deepgram", "sarvam", "openai", "gemini"]),
				model: z.string().optional(),
				language: z.string().optional(),
			})
			.optional(),
		tts: z
			.object({
				provider: z.enum([
					"elevenlabs",
					"cartesia",
					"inworld",
					"sarvam",
					"openai",
					"gemini",
				]),
				voiceId: z.string(),
				model: z.string().optional(),
			})
			.optional(),
		avatar: z
			.object({
				provider: z.literal("anam"),
				avatarId: z.string(),
				personaId: z.string().optional(),
			})
			.optional(),
		customVoiceId: z.string().optional(),
		knowledgeBaseIds: z.array(z.string()).default([]),
		systemPrompt: z.string().optional(),
	})
	.passthrough();

export type AgentConfig = z.infer<typeof agentConfigSchema>;

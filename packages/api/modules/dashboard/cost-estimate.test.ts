/**
 * Lightweight unit-style checks for usage cost estimation (no DB).
 * Run with: npx tsx packages/api/modules/dashboard/cost-estimate.test.ts
 */
import { estimateUsageCostMicros } from "@repo/database";

function assert(cond: unknown, msg: string) {
	if (!cond) {
		throw new Error(msg);
	}
}

const rates = [
	{
		modality: "LLM" as const,
		provider: "openai",
		model: null,
		unit: "TOKEN" as const,
		unitAmountMicros: 5,
	},
	{
		modality: "TTS" as const,
		provider: "elevenlabs",
		model: null,
		unit: "CHARACTER" as const,
		unitAmountMicros: 30,
	},
	{
		modality: "STT" as const,
		provider: "deepgram",
		model: null,
		unit: "MINUTE" as const,
		unitAmountMicros: 4300,
	},
];

const llm = estimateUsageCostMicros(
	{
		modality: "LLM",
		provider: "openai",
		model: "gpt-4o",
		inputTokens: 1000,
		outputTokens: 500,
		charactersCount: 0,
		audioDurationMs: 0,
		callDurationMs: 0,
		totalRequests: 0,
		egressMinutes: 0,
		billableMinutes: 0,
	},
	rates,
);
assert(llm === 1500 * 5, `LLM cost expected 7500, got ${llm}`);

const tts = estimateUsageCostMicros(
	{
		modality: "TTS",
		provider: "elevenlabs",
		model: "default",
		inputTokens: 0,
		outputTokens: 0,
		charactersCount: 100,
		audioDurationMs: 0,
		callDurationMs: 0,
		totalRequests: 0,
		egressMinutes: 0,
		billableMinutes: 0,
	},
	rates,
);
assert(tts === 3000, `TTS cost expected 3000, got ${tts}`);

const stt = estimateUsageCostMicros(
	{
		modality: "STT",
		provider: "deepgram",
		model: "nova-3",
		inputTokens: 0,
		outputTokens: 0,
		charactersCount: 0,
		audioDurationMs: 120_000,
		callDurationMs: 0,
		totalRequests: 0,
		egressMinutes: 0,
		billableMinutes: 0,
	},
	rates,
);
assert(stt === 2 * 4300, `STT cost expected 8600, got ${stt}`);

console.log("cost-estimate.test.ts: ok");

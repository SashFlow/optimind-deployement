import type { UsageModality } from "../generated/client";

export type ProviderRateUnit = "TOKEN" | "MINUTE" | "CHARACTER" | "REQUEST";

export type ProviderRate = {
	modality: UsageModality;
	provider: string;
	/** null = applies to every model of the provider */
	model: string | null;
	unit: ProviderRateUnit;
	/** Micros of currency per unit (1 USD = 1_000_000 micros) */
	unitAmountMicros: number;
};

export const PROVIDER_RATES: ProviderRate[] = [
	{
		modality: "LLM",
		provider: "openai",
		model: null,
		unit: "TOKEN",
		unitAmountMicros: 5,
	},
	{
		modality: "TTS",
		provider: "elevenlabs",
		model: null,
		unit: "CHARACTER",
		unitAmountMicros: 30,
	},
	{
		modality: "STT",
		provider: "deepgram",
		model: null,
		unit: "MINUTE",
		unitAmountMicros: 4300,
	},
];

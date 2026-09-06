import { z } from "zod";
import { publicProcedure } from "../../orpc/procedures";
import {
	CATALOG_LANGUAGES,
	CATALOG_MODELS,
	CATALOG_PROVIDERS,
	CATALOG_TIMEZONES,
	CATALOG_VOICES,
} from "./data";

export const listProviders = publicProcedure
	.route({
		method: "GET",
		path: "/catalog/providers",
		tags: ["Catalog"],
		summary: "List AI providers",
	})
	.handler(async () => ({ providers: CATALOG_PROVIDERS }));

export const listModels = publicProcedure
	.route({
		method: "GET",
		path: "/catalog/models",
		tags: ["Catalog"],
		summary: "List provider models",
	})
	.input(
		z.object({
			kind: z.enum(["llm", "realtime", "stt", "tts"]).optional(),
		}),
	)
	.handler(async ({ input }) => ({
		models: input.kind
			? CATALOG_MODELS.filter((model) => model.kind === input.kind)
			: CATALOG_MODELS,
	}));

export const listVoices = publicProcedure
	.route({
		method: "GET",
		path: "/catalog/voices",
		tags: ["Catalog"],
		summary: "List provider voices",
	})
	.input(
		z.object({
			providerModelId: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => ({
		voices: input.providerModelId
			? CATALOG_VOICES.filter(
					(voice) =>
						voice.provider_model_id === input.providerModelId,
				)
			: CATALOG_VOICES,
	}));

export const listLanguages = publicProcedure
	.route({
		method: "GET",
		path: "/catalog/languages",
		tags: ["Catalog"],
		summary: "List languages",
	})
	.handler(async () => ({ languages: CATALOG_LANGUAGES }));

export const listTimezones = publicProcedure
	.route({
		method: "GET",
		path: "/catalog/timezones",
		tags: ["Catalog"],
		summary: "List timezones",
	})
	.handler(async () => ({ timezones: CATALOG_TIMEZONES }));

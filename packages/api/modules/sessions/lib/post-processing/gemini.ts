import { createPartFromBase64, GoogleGenAI } from "@google/genai";
import { logger } from "@repo/logs";
import type { MediaPart } from "./types";

function getApiKey() {
	return (
		process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
		process.env.GEMINI_API_KEY?.trim() ||
		""
	);
}

export function hasGeminiApiKey() {
	return Boolean(getApiKey());
}

function getClient() {
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
	}
	return new GoogleGenAI({ apiKey });
}

function extractJsonObject(text: string): unknown {
	const trimmed = text.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.indexOf("{");
		const end = trimmed.lastIndexOf("}");
		if (start >= 0 && end > start) {
			return JSON.parse(trimmed.slice(start, end + 1));
		}
		throw new Error("Gemini response was not valid JSON");
	}
}

export async function generateJsonFromMedia(args: {
	model: string;
	prompt: string;
	media: MediaPart[];
}): Promise<unknown> {
	const client = getClient();
	const parts = [
		{ text: args.prompt },
		...args.media.map((item) =>
			createPartFromBase64(
				item.bytes.toString("base64"),
				item.mimeType || "application/octet-stream",
			),
		),
	];

	const response = await client.models.generateContent({
		model: args.model,
		contents: parts,
		config: {
			responseMimeType: "application/json",
			temperature: 0.2,
		},
	});

	const text = response.text?.trim();
	if (!text) {
		logger.warn("Gemini returned empty text for post-processing");
		throw new Error("Empty Gemini response");
	}
	return extractJsonObject(text);
}

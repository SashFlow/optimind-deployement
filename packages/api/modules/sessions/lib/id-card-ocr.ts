import { db, getAgentSessionById } from "@repo/database";
import { logger } from "@repo/logs";
import { downloadEndUserFile } from "./post-processing/download";
import {
	generateJsonFromMedia,
	hasGeminiApiKey,
} from "./post-processing/gemini";
import { DEFAULT_POST_PROCESSING_MODEL } from "./post-processing/prompts";

type SessionFileLike = {
	id: string;
	name: string;
	url: string;
	type: string;
};

function baseName(name: string) {
	return name.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
}

/** Prefer newest cropped card, then newest full-frame (files are usually createdAt desc). */
function pickIdCardFile(files: SessionFileLike[]): SessionFileLike | null {
	let full: SessionFileLike | null = null;
	for (const file of files) {
		const name = baseName(file.name);
		if (name === "id-card.jpg" || name.startsWith("id-card.")) {
			if (!name.startsWith("id-card-full")) {
				return file;
			}
		}
		if (
			!full &&
			(name === "id-card-full.jpg" || name.startsWith("id-card-full."))
		) {
			full = file;
		}
	}
	return full;
}

/** Fast multimodal model for mid-session ID OCR. */
export const ID_CARD_OCR_MODEL =
	process.env.ID_CARD_OCR_MODEL?.trim() || DEFAULT_POST_PROCESSING_MODEL;

export const ID_CARD_OCR_PROMPT = `You are reading a government or photo identity document from a camera capture.
Return JSON only with this shape:
{"idType":string,"extracted":{"fullName":string,"documentNumber":string,"dateOfBirth":string,"expiryDate":string,"issueDate":string,"nationality":string,"address":string,"sex":string,"fatherName":string,"additionalFields":object},"confidence":number,"summary":string}

Rules:
- idType: short document type label, e.g. "Aadhaar", "PAN", "Passport", "Driver License", "Voter ID", "National ID", "Residence Permit", "Other". Prefer the specific type over "ID Card".
- extracted: fill what you can read; use empty string for unread fields
- extracted.additionalFields: optional map of other labeled fields you can read (string values only)
- confidence: 0..1 overall OCR quality
- summary: one short sentence naming the document type and readability
- Do not invent values you cannot see`;

export type IdCardOcrResult = {
	idType: string;
	extracted: Record<string, string>;
	confidence: number;
	summary: string;
	model: string;
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringRecord(value: unknown): Record<string, string> {
	const record = asRecord(value);
	const out: Record<string, string> = {};
	for (const [key, item] of Object.entries(record)) {
		if (key === "additionalFields") {
			const nested = asRecord(item);
			for (const [nestedKey, nestedValue] of Object.entries(nested)) {
				if (typeof nestedValue === "string") {
					out[nestedKey] = nestedValue;
				} else if (nestedValue != null) {
					out[nestedKey] = String(nestedValue);
				}
			}
			continue;
		}
		if (typeof item === "string") {
			out[key] = item;
		} else if (item == null) {
			out[key] = "";
		} else if (typeof item === "number" || typeof item === "boolean") {
			out[key] = String(item);
		}
	}
	return out;
}

export function parseIdCardOcr(raw: unknown, model: string): IdCardOcrResult {
	const data = asRecord(raw);
	const extracted = asStringRecord(data.extracted);
	const idType =
		asString(data.idType).trim() ||
		asString(extracted.documentType).trim() ||
		asString(extracted.idType).trim() ||
		"Unknown";

	return {
		idType,
		extracted,
		confidence: Math.min(1, Math.max(0, asNumber(data.confidence) ?? 0)),
		summary: asString(data.summary, "No summary provided."),
		model,
	};
}

/**
 * OCR the latest ID card capture for a live session using a fast Gemini model.
 * Prefers the cropped `id-card.jpg`, falls back to `id-card-full.jpg`.
 */
export async function ocrSessionIdCard(
	sessionId: string,
): Promise<IdCardOcrResult> {
	if (!hasGeminiApiKey()) {
		throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
	}

	const session = await getAgentSessionById(sessionId);
	if (!session) {
		throw new Error("Session not found");
	}

	const idFile = pickIdCardFile(session.files ?? []);
	if (!idFile) {
		throw new Error("No ID card image found for this session");
	}

	const bytes = await downloadEndUserFile(idFile.url);
	const raw = await generateJsonFromMedia({
		model: ID_CARD_OCR_MODEL,
		prompt: ID_CARD_OCR_PROMPT,
		media: [
			{
				mimeType: idFile.type || "image/jpeg",
				bytes,
			},
		],
	});

	const result = parseIdCardOcr(raw, ID_CARD_OCR_MODEL);

	try {
		const metadata =
			session.metadata &&
			typeof session.metadata === "object" &&
			!Array.isArray(session.metadata)
				? (session.metadata as Record<string, unknown>)
				: {};
		await db.agentSession.update({
			where: { id: sessionId },
			data: {
				metadata: {
					...metadata,
					idCardOcr: {
						...result,
						fileId: idFile.id,
						fileName: idFile.name,
						capturedAt: new Date().toISOString(),
					},
				},
			},
		});
	} catch (error) {
		logger.warn("Failed to persist mid-session ID OCR result", {
			sessionId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return result;
}

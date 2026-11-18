import {
	generateJsonFromMedia,
	hasGeminiApiKey,
} from "./post-processing/gemini";
import { DEFAULT_POST_PROCESSING_MODEL } from "./post-processing/prompts";

/** Fast multimodal model for mid-session glasses / headphones checks. */
export const FACE_ACCESSORY_CHECK_MODEL =
	process.env.FACE_ACCESSORY_CHECK_MODEL?.trim() ||
	DEFAULT_POST_PROCESSING_MODEL;

export const FACE_ACCESSORY_CHECK_PROMPT = `You are checking a face-capture camera still for identity verification.
Return JSON only with this shape:
{"glassesDetected":boolean,"headphonesDetected":boolean,"clear":boolean,"message":string}

Rules:
- glassesDetected: true if spectacles, eyeglasses, sunglasses, or clear eyewear frames are on the face
- headphonesDetected: true if ANY of these are visible:
  - over-ear / on-ear headphones, wireless earbuds, earphones, or a headset on/near the ears
  - wired earphones even when the buds are hard to see: look for earphone wires/cables from the ears down the neck/chest, a Y-split cable, dangling headphone cords, or a wire running into an ear
- clear: true only when BOTH glassesDetected and headphonesDetected are false
- message: short candidate-facing direction. When glassesDetected, tell them to remove glasses/spectacles. When headphonesDetected, tell them to remove headphones/earphones. If both, mention both. When clear, use an empty string.
- Treat visible earphone wires as strong evidence of headphonesDetected=true even if the earbud tips are occluded.
- Do not invent accessories you cannot see. Prefer clear=true when unsure about thin clear frames or ordinary necklace chains (not earphone cords).`;

export type FaceAccessoryCheckResult = {
	glassesDetected: boolean;
	headphonesDetected: boolean;
	clear: boolean;
	message: string;
	model: string;
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asBoolean(value: unknown): boolean {
	return value === true;
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

export function parseFaceAccessoryCheck(
	raw: unknown,
	model: string,
): FaceAccessoryCheckResult {
	const data = asRecord(raw);
	const glassesDetected = asBoolean(data.glassesDetected);
	const headphonesDetected = asBoolean(data.headphonesDetected);
	const clear =
		typeof data.clear === "boolean"
			? data.clear && !glassesDetected && !headphonesDetected
			: !glassesDetected && !headphonesDetected;
	let message = asString(data.message).trim();
	if (clear) {
		message = "";
	} else if (!message) {
		if (glassesDetected && headphonesDetected) {
			message = "Please remove your glasses and headphones";
		} else if (glassesDetected) {
			message = "Please remove your spectacles / glasses";
		} else if (headphonesDetected) {
			message = "Please remove earphones or headphones";
		}
	}
	return {
		glassesDetected,
		headphonesDetected,
		clear,
		message,
		model,
	};
}

/**
 * Check a face-capture JPEG for glasses / headphones with a fast Gemini model.
 * Does not persist the frame.
 */
export async function checkFaceAccessories(args: {
	bytes: Buffer | Uint8Array;
	mimeType?: string;
}): Promise<FaceAccessoryCheckResult> {
	if (!hasGeminiApiKey()) {
		throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
	}

	const bytes =
		args.bytes instanceof Buffer ? args.bytes : Buffer.from(args.bytes);
	if (bytes.byteLength === 0) {
		throw new Error("Empty image payload");
	}

	const raw = await generateJsonFromMedia({
		model: FACE_ACCESSORY_CHECK_MODEL,
		prompt: FACE_ACCESSORY_CHECK_PROMPT,
		media: [
			{
				mimeType: args.mimeType || "image/jpeg",
				bytes,
			},
		],
		temperature: 0.1,
	});

	return parseFaceAccessoryCheck(raw, FACE_ACCESSORY_CHECK_MODEL);
}

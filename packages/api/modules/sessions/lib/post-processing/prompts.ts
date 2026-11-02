import type { PostProcessingConfig } from "./types";

export const DEFAULT_POST_PROCESSING_MODEL = "gemini-3.1-flash-lite";

export const DEFAULT_POST_PROCESSING_PROMPTS: PostProcessingConfig["prompts"] =
	{
		face_liveness: `You are evaluating a face capture image for liveness (anti-spoofing) for identity verification.
Analyze the image and return JSON only:
{"livenessPass":boolean,"confidence":number,"signals":string[],"summary":string}
- confidence is 0..1
- signals: short observations (e.g. "natural skin texture", "possible screen glare", "flat print-like appearance")
- Prefer fail when evidence is weak or the face looks like a photo/screen/mask
- summary: one short sentence for an underwriter`,
		id_extraction: `Extract identity document fields from the ID card image. Return JSON only:
{"extracted":{"fullName":string,"documentNumber":string,"dateOfBirth":string,"expiryDate":string,"nationality":string,"documentType":string,"address":string,"sex":string},"confidence":number,"summary":string}
- Use empty string for fields you cannot read
- confidence is 0..1 for overall OCR quality
- summary: one short sentence about document readability and type`,
		body_assessment: `You are assisting insurance underwriting with a best-effort visual assessment from full-body capture image(s) and optional video.
These are AI estimates only — not clinical measurements. Return JSON only:
{"vitals":{"heightCm":number|null,"weightKg":number|null,"bmi":number|null,"heartRateBpm":number|null,"respiratoryRate":number|null,"fitnessAssessment":string},"physicalCondition":{"impairments":string[],"mobilityLimitations":string[],"postureNotes":string,"assistiveDevices":string[],"otherFindings":string[]},"underwriting":{"identityStatus":string,"livenessStatus":string,"riskIndicators":string[],"exceptionFlags":string[],"underwriterReviewRecommended":boolean,"summary":string},"videoUnavailable":boolean}
- Prefer null over inventing vitals when the media does not support a guess
- Note visible impairments, amputations, mobility aids, posture abnormalities, swelling, asymmetry
- Flag uncertainty and recommend underwriter review when evidence is weak`,
	};

export function resolvePostProcessingConfig(
	raw: unknown,
): PostProcessingConfig {
	const source =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};
	const promptsRaw =
		source.prompts &&
		typeof source.prompts === "object" &&
		!Array.isArray(source.prompts)
			? (source.prompts as Record<string, unknown>)
			: {};

	return {
		enabled: source.enabled === true,
		model:
			typeof source.model === "string" && source.model.trim()
				? source.model.trim()
				: DEFAULT_POST_PROCESSING_MODEL,
		prompts: {
			face_liveness:
				typeof promptsRaw.face_liveness === "string" &&
				promptsRaw.face_liveness.trim()
					? promptsRaw.face_liveness
					: DEFAULT_POST_PROCESSING_PROMPTS.face_liveness,
			id_extraction:
				typeof promptsRaw.id_extraction === "string" &&
				promptsRaw.id_extraction.trim()
					? promptsRaw.id_extraction
					: DEFAULT_POST_PROCESSING_PROMPTS.id_extraction,
			body_assessment:
				typeof promptsRaw.body_assessment === "string" &&
				promptsRaw.body_assessment.trim()
					? promptsRaw.body_assessment
					: DEFAULT_POST_PROCESSING_PROMPTS.body_assessment,
		},
	};
}

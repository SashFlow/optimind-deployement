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
		body_assessment: `You are assisting insurance underwriting with a best-effort VISUAL ESTIMATE from full-body capture image(s) and optional video.
These values are approximate AI guesses for triage only — NOT clinical measurements, NOT a diagnosis, and NOT medical advice.
You MUST still output numeric estimates for every vital field. Do not omit them and do not use null.
Return JSON only with this exact shape (all vitals are required numbers):
{"vitals":{"heightCm":number,"weightKg":number,"bmi":number,"heartRateBpm":number,"respiratoryRate":number,"fitnessAssessment":string},"physicalCondition":{"impairments":string[],"mobilityLimitations":string[],"postureNotes":string,"assistiveDevices":string[],"otherFindings":string[]},"underwriting":{"identityStatus":string,"livenessStatus":string,"riskIndicators":string[],"exceptionFlags":string[],"underwriterReviewRecommended":boolean,"summary":string},"videoUnavailable":boolean}
Required estimation rules:
- heightCm: adult visual estimate typically 140–200 (cm). Use body proportions vs surroundings when possible.
- weightKg: adult visual estimate typically 40–150 (kg).
- bmi: compute as weightKg / (heightCm/100)^2 and round to 1 decimal.
- heartRateBpm: if video shows face/chest motion, estimate resting-like BPM (typical 55–100); otherwise give a plausible resting estimate from appearance and note uncertainty in underwriting.summary / exceptionFlags.
- respiratoryRate: breaths/min typically 12–22; estimate from visible chest/shoulder motion when video is present, otherwise a plausible resting estimate.
- fitnessAssessment: one short sentence.
- If uncertain, still give your best single number and set underwriterReviewRecommended=true and add an exceptionFlag like "vitals_low_confidence".
- Never return null/empty for heightCm, weightKg, bmi, heartRateBpm, or respiratoryRate.
- Note visible impairments, amputations, mobility aids, posture abnormalities, swelling, asymmetry.`,
		media_integrity: `You are reviewing session recordings (user video and/or user/agent audio) for underwriting integrity and quality.
Media parts may be labeled in the prompt context. Timestamps are milliseconds from the start of each provided media file (use null when unknown).
Return JSON only:
{"audioIssues":[{"label":string,"detail":string,"startMs":number|null,"endMs":number|null,"severity":"info"|"warn"|"high"}],"videoIssues":[{"label":string,"detail":string,"startMs":number|null,"endMs":number|null,"severity":"info"|"warn"|"high"}],"multipleVoices":{"detected":boolean,"count":number|null,"events":[{"label":string,"detail":string,"startMs":number|null,"endMs":number|null,"severity":"info"|"warn"|"high"}]},"multipleUsers":{"detected":boolean,"count":number|null,"events":[{"label":string,"detail":string,"startMs":number|null,"endMs":number|null,"severity":"info"|"warn"|"high"}]},"deviceDetection":{"devices":string[],"events":[{"label":string,"detail":string,"startMs":number|null,"endMs":number|null,"severity":"info"|"warn"|"high"}],"summary":string},"summary":string,"underwriterReviewRecommended":boolean}
- audioIssues: noise, clipping, dropouts, echo, muted stretches, overlapping speech, telephony artifacts
- videoIssues: freeze, black frames, extreme blur, camera covered, low light, framing off, screen replay cues
- multipleVoices: more than one distinct human speaking on the user audio (ignore TTS/agent track when separable)
- multipleUsers: more than one person visible/present on camera or clearly participating on user media
- deviceDetection: phones, tablets, laptops, headphones, earbuds, second screens, printed photos, virtual backgrounds — list concrete devices observed
- Prefer concrete timed events when evidence supports them; use empty arrays when nothing notable
- underwriterReviewRecommended true when integrity risk is material`,
		disposition: `You are classifying the outcome of an insurance video verification / awareness journey.
Use the provided session context (end reason, status, transcript, user responses, and prior capture/integrity summaries). There is NO external MPRO/proposal database — infer mismatches only from what the customer said vs what the agent stated or what responses imply.
Return JSON only:
{"disposition":"positive"|"negative"|"call_drop"|"call_cancel","category":string|null,"subcategory":string|null,"confidence":number,"summary":string,"reasons":string[],"mismatchFields":string[]}

Disposition definitions:
- positive: Customer successfully completes the verification and awareness journey with no material mismatch or cancel/fraud signals.
- negative: Journey completed, but customer responses conflict with details stated in the conversation (premium, policy term, PPT, annuity start/portion, benefits). Case remains complete but marked Negative.
- call_drop: Journey NOT completed due to customer, connectivity, technical, authentication, or interaction interruptions.
- call_cancel: Fraud / misconduct / unauthorized assistance — third-party interference, impersonation, fraudulent activity, lip-sync/proxy verification, market conduct violation, unauthorized assistance.

Category allow-list (pick one matching the disposition; null only for positive if unsure):
- positive: "Verification Completed"
- negative: "Premium Amount Mismatch" | "Policy Term Mismatch" | "Premium Payment Term (PPT) Mismatch" | "Annuity Start Date Mismatch" | "Annuity Portion / Allocation Mismatch" | "Benefit Mismatch" | "Other Mismatch"
- call_drop: "Connectivity & Technical Issues" | "Customer Unavailable / Inactive" | "Verification & Authentication Issues" | "Customer Decision / Intent" | "Language-Related Issues"
- call_cancel: "Third-Party Interference" | "Customer Impersonation" | "Fraudulent Activity" | "Lip-Sync / Proxy Verification" | "Market Conduct Violation" | "Unauthorized Assistance"

Priority rules:
1. Prefer call_cancel when fraud/proxy/third-party/impersonation/unauthorized assistance signals dominate (including strong media-integrity multi-user / device cues).
2. Prefer call_drop when the journey is incomplete or end reason suggests drop/timeout/left/error, and there is no clear cancel/fraud case.
3. Prefer negative when the customer completed verification but stated values conflict with what they were told / confirmed inconsistently.
4. Prefer positive only when verification completes without material mismatch or cancel/drop signals.
- confidence is 0..1
- reasons: short concrete evidence bullets from transcript/responses/integrity
- mismatchFields: for negative, keys like premium, policy_term, ppt, annuity_start_date, annuity_portion, benefit; empty otherwise
- summary: one short underwriter-facing sentence`,
	};

export const DISPOSITION_CATEGORIES = {
	positive: ["Verification Completed"],
	negative: [
		"Premium Amount Mismatch",
		"Policy Term Mismatch",
		"Premium Payment Term (PPT) Mismatch",
		"Annuity Start Date Mismatch",
		"Annuity Portion / Allocation Mismatch",
		"Benefit Mismatch",
		"Other Mismatch",
	],
	call_drop: [
		"Connectivity & Technical Issues",
		"Customer Unavailable / Inactive",
		"Verification & Authentication Issues",
		"Customer Decision / Intent",
		"Language-Related Issues",
	],
	call_cancel: [
		"Third-Party Interference",
		"Customer Impersonation",
		"Fraudulent Activity",
		"Lip-Sync / Proxy Verification",
		"Market Conduct Violation",
		"Unauthorized Assistance",
	],
} as const;

export const DISPOSITION_RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		disposition: {
			type: "string",
			enum: ["positive", "negative", "call_drop", "call_cancel"],
		},
		category: { type: ["string", "null"] },
		subcategory: { type: ["string", "null"] },
		confidence: { type: "number" },
		summary: { type: "string" },
		reasons: { type: "array", items: { type: "string" } },
		mismatchFields: { type: "array", items: { type: "string" } },
	},
	required: [
		"disposition",
		"category",
		"subcategory",
		"confidence",
		"summary",
		"reasons",
		"mismatchFields",
	],
} as const;

/** Enforced Gemini JSON schema so vitals cannot be omitted/null. */
export const BODY_ASSESSMENT_RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		vitals: {
			type: "object",
			properties: {
				heightCm: { type: "number" },
				weightKg: { type: "number" },
				bmi: { type: "number" },
				heartRateBpm: { type: "number" },
				respiratoryRate: { type: "number" },
				fitnessAssessment: { type: "string" },
			},
			required: [
				"heightCm",
				"weightKg",
				"bmi",
				"heartRateBpm",
				"respiratoryRate",
				"fitnessAssessment",
			],
		},
		physicalCondition: {
			type: "object",
			properties: {
				impairments: { type: "array", items: { type: "string" } },
				mobilityLimitations: {
					type: "array",
					items: { type: "string" },
				},
				postureNotes: { type: "string" },
				assistiveDevices: { type: "array", items: { type: "string" } },
				otherFindings: { type: "array", items: { type: "string" } },
			},
			required: [
				"impairments",
				"mobilityLimitations",
				"postureNotes",
				"assistiveDevices",
				"otherFindings",
			],
		},
		underwriting: {
			type: "object",
			properties: {
				identityStatus: { type: "string" },
				livenessStatus: { type: "string" },
				riskIndicators: { type: "array", items: { type: "string" } },
				exceptionFlags: { type: "array", items: { type: "string" } },
				underwriterReviewRecommended: { type: "boolean" },
				summary: { type: "string" },
			},
			required: [
				"identityStatus",
				"livenessStatus",
				"riskIndicators",
				"exceptionFlags",
				"underwriterReviewRecommended",
				"summary",
			],
		},
		videoUnavailable: { type: "boolean" },
	},
	required: [
		"vitals",
		"physicalCondition",
		"underwriting",
		"videoUnavailable",
	],
} as const;

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
			media_integrity:
				typeof promptsRaw.media_integrity === "string" &&
				promptsRaw.media_integrity.trim()
					? promptsRaw.media_integrity
					: DEFAULT_POST_PROCESSING_PROMPTS.media_integrity,
			disposition:
				typeof promptsRaw.disposition === "string" &&
				promptsRaw.disposition.trim()
					? promptsRaw.disposition
					: DEFAULT_POST_PROCESSING_PROMPTS.disposition,
		},
	};
}

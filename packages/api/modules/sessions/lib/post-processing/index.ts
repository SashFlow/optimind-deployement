import { db, getAgentSessionById } from "@repo/database";
import { logger } from "@repo/logs";
import { uploadEndUserBytes } from "../end-user-files";
import { classifySessionFiles, hasAnyCapture } from "./classify-files";
import { downloadEndUserFile, downloadSessionRecording } from "./download";
import { generateJsonFromMedia, hasGeminiApiKey } from "./gemini";
import { resolvePostProcessingConfig } from "./prompts";
import { buildPostProcessingPdf } from "./report-pdf";
import type {
	BodyAssessmentResult,
	FaceLivenessResult,
	IdExtractionResult,
	MediaPart,
	PostProcessingResult,
} from "./types";

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

function asBoolean(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter(Boolean);
}

function asStringRecord(value: unknown): Record<string, string> {
	const record = asRecord(value);
	const out: Record<string, string> = {};
	for (const [key, item] of Object.entries(record)) {
		if (typeof item === "string") {
			out[key] = item;
		} else if (item == null) {
			out[key] = "";
		} else {
			out[key] = String(item);
		}
	}
	return out;
}

function parseFace(raw: unknown): FaceLivenessResult {
	const data = asRecord(raw);
	return {
		livenessPass: asBoolean(data.livenessPass),
		confidence: Math.min(1, Math.max(0, asNumber(data.confidence) ?? 0)),
		signals: asStringArray(data.signals),
		summary: asString(data.summary, "No summary provided."),
	};
}

function parseIdCard(raw: unknown): IdExtractionResult {
	const data = asRecord(raw);
	return {
		extracted: asStringRecord(data.extracted),
		confidence: Math.min(1, Math.max(0, asNumber(data.confidence) ?? 0)),
		summary: asString(data.summary, "No summary provided."),
	};
}

function parseBody(raw: unknown): BodyAssessmentResult {
	const data = asRecord(raw);
	const vitals = asRecord(data.vitals);
	const physical = asRecord(data.physicalCondition);
	const underwriting = asRecord(data.underwriting);
	return {
		vitals: {
			heightCm: asNumber(vitals.heightCm),
			weightKg: asNumber(vitals.weightKg),
			bmi: asNumber(vitals.bmi),
			heartRateBpm: asNumber(vitals.heartRateBpm),
			respiratoryRate: asNumber(vitals.respiratoryRate),
			fitnessAssessment: asString(vitals.fitnessAssessment),
		},
		physicalCondition: {
			impairments: asStringArray(physical.impairments),
			mobilityLimitations: asStringArray(physical.mobilityLimitations),
			postureNotes: asString(physical.postureNotes),
			assistiveDevices: asStringArray(physical.assistiveDevices),
			otherFindings: asStringArray(physical.otherFindings),
		},
		underwriting: {
			identityStatus: asString(underwriting.identityStatus),
			livenessStatus: asString(underwriting.livenessStatus),
			riskIndicators: asStringArray(underwriting.riskIndicators),
			exceptionFlags: asStringArray(underwriting.exceptionFlags),
			underwriterReviewRecommended: asBoolean(
				underwriting.underwriterReviewRecommended,
			),
			summary: asString(underwriting.summary, "No summary provided."),
		},
		videoUnavailable: asBoolean(data.videoUnavailable),
	};
}

function readExistingResult(
	metadata: Record<string, unknown>,
): PostProcessingResult | null {
	const raw = metadata.postProcessing;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return null;
	}
	return raw as PostProcessingResult;
}

async function persistResult(
	sessionId: string,
	metadata: Record<string, unknown>,
	result: PostProcessingResult,
) {
	await db.agentSession.update({
		where: { id: sessionId },
		data: {
			metadata: {
				...metadata,
				postProcessing: result,
			},
		},
	});
}

async function mediaFromFile(
	storageKey: string,
	mimeType: string,
): Promise<MediaPart> {
	const bytes = await downloadEndUserFile(storageKey);
	return { mimeType: mimeType || "image/jpeg", bytes };
}

/**
 * Run capture post-processing for a completed session.
 * Idempotent while status is running/completed (unless retryForVideo).
 */
export async function runPostProcessing(
	sessionId: string,
	opts?: { retryForVideo?: boolean },
) {
	if (!hasGeminiApiKey()) {
		logger.warn("Skipping post-processing: GOOGLE_GENERATIVE_AI_API_KEY missing", {
			sessionId,
		});
		return;
	}

	const session = await getAgentSessionById(sessionId);
	if (!session) {
		return;
	}

	const metadata = asRecord(session.metadata);
	const existing = readExistingResult(metadata);
	if (
		existing &&
		(existing.status === "running" ||
			(existing.status === "completed" && !opts?.retryForVideo) ||
			(existing.status === "completed" &&
				opts?.retryForVideo &&
				!existing.videoUnavailable))
	) {
		return;
	}

	const modalities = asRecord(
		asRecord(session.configSnapshot).session_modalities,
	);
	const config = resolvePostProcessingConfig(modalities.post_processing);
	if (!config.enabled) {
		return;
	}

	if (!session.endUserId) {
		await persistResult(sessionId, metadata, {
			status: "skipped",
			completedAt: new Date().toISOString(),
			error: "Session has no end user; cannot store report file.",
			model: config.model,
		});
		return;
	}

	const classified = classifySessionFiles(session.files ?? []);
	if (!hasAnyCapture(classified)) {
		await persistResult(sessionId, metadata, {
			status: "skipped",
			completedAt: new Date().toISOString(),
			model: config.model,
			error: "No face, ID, or body capture files found for this session.",
		});
		return;
	}

	const startedAt = new Date().toISOString();
	const running: PostProcessingResult = {
		...(existing ?? {}),
		status: "running",
		startedAt: existing?.startedAt ?? startedAt,
		model: config.model,
		error: undefined,
	};
	await persistResult(sessionId, metadata, running);

	const result: PostProcessingResult = {
		...running,
		status: "completed",
		completedAt: new Date().toISOString(),
		model: config.model,
	};

	try {
		if (classified.face) {
			const media = [
				await mediaFromFile(
					classified.face.url,
					classified.face.type || "image/jpeg",
				),
			];
			result.face = parseFace(
				await generateJsonFromMedia({
					model: config.model,
					prompt: config.prompts.face_liveness,
					media,
				}),
			);
		}

		const idFile = classified.idCard ?? classified.idCardFull;
		if (idFile) {
			const media = [
				await mediaFromFile(idFile.url, idFile.type || "image/jpeg"),
			];
			result.idCard = parseIdCard(
				await generateJsonFromMedia({
					model: config.model,
					prompt: config.prompts.id_extraction,
					media,
				}),
			);
		}

		if (classified.body) {
			const media: MediaPart[] = [
				await mediaFromFile(
					classified.body.url,
					classified.body.type || "image/jpeg",
				),
			];
			const recording = await downloadSessionRecording(
				session.egressJobs ?? [],
			);
			const videoUnavailable = !recording;
			if (recording) {
				media.push(recording);
			}
			const body = parseBody(
				await generateJsonFromMedia({
					model: config.model,
					prompt: config.prompts.body_assessment,
					media,
				}),
			);
			body.videoUnavailable = videoUnavailable || body.videoUnavailable;
			result.body = body;
			result.videoUnavailable = body.videoUnavailable;
		}

		const pdf = await buildPostProcessingPdf({
			sessionId: session.id,
			agentName: session.agent?.name,
			endUserName: session.endUser?.name,
			startedAt: session.startedAt,
			endedAt: session.endedAt,
			result,
		});

		const reportFile = await uploadEndUserBytes({
			session: {
				id: session.id,
				organizationId: session.organizationId,
				endUserId: session.endUserId,
			},
			bytes: pdf,
			name: "post-processing-report.pdf",
			contentType: "application/pdf",
		});
		result.reportFileId = reportFile.id;

		const latest = await getAgentSessionById(sessionId);
		await persistResult(sessionId, asRecord(latest?.metadata), result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Post-processing failed";
		logger.error("Post-processing failed", { sessionId, error });
		const latest = await getAgentSessionById(sessionId);
		await persistResult(sessionId, asRecord(latest?.metadata), {
			...result,
			status: "failed",
			completedAt: new Date().toISOString(),
			error: message,
		});
	}
}

/** Fire from session-end hooks; never throws. */
export async function runPostProcessingSafe(sessionId: string) {
	try {
		await runPostProcessing(sessionId);
	} catch (error) {
		logger.error("Failed to run post-processing", { sessionId, error });
	}
}

/**
 * Re-run body analysis when a prior completed run lacked video and egress is now ready.
 */
export async function maybeRetryPostProcessingForVideo(sessionId: string) {
	try {
		const session = await getAgentSessionById(sessionId);
		if (!session) {
			return;
		}
		const existing = readExistingResult(asRecord(session.metadata));
		if (
			!existing ||
			existing.status !== "completed" ||
			!existing.videoUnavailable
		) {
			return;
		}
		const recording = await downloadSessionRecording(
			session.egressJobs ?? [],
		);
		if (!recording) {
			return;
		}
		await runPostProcessing(sessionId, { retryForVideo: true });
	} catch (error) {
		logger.error("Failed to retry post-processing for video", {
			sessionId,
			error,
		});
	}
}

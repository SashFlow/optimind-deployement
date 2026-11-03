import { db, getAgentSessionById } from "@repo/database";
import { logger } from "@repo/logs";
import { uploadEndUserBytes } from "../end-user-files";
import { classifySessionFiles, hasAnyCapture } from "./classify-files";
import {
	downloadEndUserFile,
	downloadSessionMediaTracks,
	downloadSessionRecording,
} from "./download";
import { generateJsonFromMedia, hasGeminiApiKey } from "./gemini";
import {
	BODY_ASSESSMENT_RESPONSE_SCHEMA,
	resolvePostProcessingConfig,
} from "./prompts";
import {
	buildPostProcessingPdf,
	type ReportImage,
	type UserResponseEntry,
} from "./report-pdf";
import type {
	BodyAssessmentResult,
	FaceLivenessResult,
	IdExtractionResult,
	MediaIntegrityResult,
	MediaPart,
	PostProcessingResult,
	TimedMediaFinding,
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
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const cleaned = value.trim().replace(/,/g, "");
		const match = /-?\d+(\.\d+)?/.exec(cleaned);
		if (!match) {
			return null;
		}
		const parsed = Number(match[0]);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
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

function deriveBmi(
	heightCm: number | null,
	weightKg: number | null,
): number | null {
	if (
		heightCm == null ||
		weightKg == null ||
		heightCm <= 0 ||
		weightKg <= 0
	) {
		return null;
	}
	const meters = heightCm / 100;
	return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

function parseBody(raw: unknown): BodyAssessmentResult {
	const data = asRecord(raw);
	const vitals = asRecord(data.vitals);
	const physical = asRecord(data.physicalCondition);
	const underwriting = asRecord(data.underwriting);
	const heightCm = asNumber(vitals.heightCm);
	const weightKg = asNumber(vitals.weightKg);
	const bmi = asNumber(vitals.bmi) ?? deriveBmi(heightCm, weightKg);
	const heartRateBpm = asNumber(vitals.heartRateBpm);
	const respiratoryRate = asNumber(vitals.respiratoryRate);
	const exceptionFlags = asStringArray(underwriting.exceptionFlags);
	const missingVitals =
		heightCm == null ||
		weightKg == null ||
		bmi == null ||
		heartRateBpm == null ||
		respiratoryRate == null;

	return {
		vitals: {
			heightCm,
			weightKg,
			bmi,
			heartRateBpm,
			respiratoryRate,
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
			exceptionFlags: missingVitals
				? Array.from(
						new Set([...exceptionFlags, "vitals_incomplete"]),
					)
				: exceptionFlags,
			underwriterReviewRecommended:
				asBoolean(underwriting.underwriterReviewRecommended) ||
				missingVitals,
			summary: asString(underwriting.summary, "No summary provided."),
		},
		videoUnavailable: asBoolean(data.videoUnavailable),
	};
}

function parseSeverity(value: unknown): TimedMediaFinding["severity"] {
	if (value === "high" || value === "warn" || value === "info") {
		return value;
	}
	return "info";
}

function parseTimedFindings(value: unknown): TimedMediaFinding[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const findings: TimedMediaFinding[] = [];
	for (const item of value) {
		const record = asRecord(item);
		const label = asString(record.label).trim();
		const detail = asString(record.detail).trim();
		if (!label && !detail) {
			continue;
		}
		findings.push({
			label: label || "Finding",
			detail,
			startMs: asNumber(record.startMs),
			endMs: asNumber(record.endMs),
			severity: parseSeverity(record.severity),
		});
	}
	return findings;
}

function parseMediaIntegrity(
	raw: unknown,
	mediaAvailable: MediaIntegrityResult["mediaAvailable"],
): MediaIntegrityResult {
	const data = asRecord(raw);
	const multipleVoices = asRecord(data.multipleVoices);
	const multipleUsers = asRecord(data.multipleUsers);
	const deviceDetection = asRecord(data.deviceDetection);
	return {
		audioIssues: parseTimedFindings(data.audioIssues),
		videoIssues: parseTimedFindings(data.videoIssues),
		multipleVoices: {
			detected: asBoolean(multipleVoices.detected),
			count: asNumber(multipleVoices.count),
			events: parseTimedFindings(multipleVoices.events),
		},
		multipleUsers: {
			detected: asBoolean(multipleUsers.detected),
			count: asNumber(multipleUsers.count),
			events: parseTimedFindings(multipleUsers.events),
		},
		deviceDetection: {
			devices: asStringArray(deviceDetection.devices),
			events: parseTimedFindings(deviceDetection.events),
			summary: asString(deviceDetection.summary),
		},
		mediaAvailable,
		summary: asString(data.summary, "No media integrity summary provided."),
		underwriterReviewRecommended: asBoolean(
			data.underwriterReviewRecommended,
		),
	};
}

function hasCompleteEgress(jobs: Array<{ status?: string | null }>) {
	return jobs.some((job) => job.status === "COMPLETE");
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

function pushReportImage(
	images: ReportImage[],
	kind: ReportImage["kind"],
	label: string,
	media: MediaPart | null | undefined,
) {
	if (!media?.bytes?.byteLength) {
		return;
	}
	images.push({
		kind,
		label,
		bytes: media.bytes,
		mimeType: media.mimeType,
	});
}

function fileBaseName(name: string) {
	return name.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
}

function findUploadedUserResponseFile(
	files: Array<{ name: string; url: string }>,
) {
	for (const file of files) {
		if (fileBaseName(file.name) === "user_response.json") {
			return file;
		}
	}
	return null;
}

function parseUploadedUserResponses(bytes: Buffer): UserResponseEntry[] {
	try {
		const parsed: unknown = JSON.parse(bytes.toString("utf8"));
		const list = Array.isArray(parsed)
			? parsed
			: Array.isArray(asRecord(parsed).responses)
				? (asRecord(parsed).responses as unknown[])
				: [];

		const entries: UserResponseEntry[] = [];
		for (const item of list) {
			const record = asRecord(item);
			const question =
				asString(record.question) ||
				asString(record.label) ||
				asString(record.key);
			if (!question && record.answer == null) {
				continue;
			}
			entries.push({
				question: question || "Question",
				answer: record.answer ?? null,
				key: asString(record.key) || undefined,
				label: asString(record.label) || undefined,
			});
		}
		return entries;
	} catch {
		return [];
	}
}

async function loadUploadedUserResponses(
	files: Array<{ name: string; url: string }>,
	sessionId: string,
): Promise<UserResponseEntry[]> {
	const uploaded = findUploadedUserResponseFile(files);
	if (!uploaded) {
		return [];
	}
	try {
		const bytes = await downloadEndUserFile(uploaded.url);
		return parseUploadedUserResponses(bytes);
	} catch (error) {
		logger.warn("Failed to load uploaded User_response.json for report", {
			sessionId,
			error,
		});
		return [];
	}
}

function buildUserResponses(session: {
	metadata?: unknown;
	configSnapshot?: unknown;
	transcript?: {
		segments?: Array<{ role: string; text: string; sequence?: number }>;
	} | null;
}): UserResponseEntry[] {
	const metadata = asRecord(session.metadata);
	const collected = asRecord(metadata.collectedData);
	const config = asRecord(session.configSnapshot);
	const fieldsRaw = config.data_collection_fields;
	const fields = Array.isArray(fieldsRaw) ? fieldsRaw : [];

	const fromFields: UserResponseEntry[] = [];
	const seenKeys = new Set<string>();

	for (const field of fields) {
		const record = asRecord(field);
		const key = asString(record.key) || asString(record.name);
		if (!key) {
			continue;
		}
		seenKeys.add(key);
		const label = asString(record.label) || key;
		const description = asString(record.description);
		fromFields.push({
			key,
			label,
			question: description || label,
			answer: key in collected ? collected[key] : null,
		});
	}

	for (const [key, value] of Object.entries(collected)) {
		if (seenKeys.has(key)) {
			continue;
		}
		fromFields.push({
			key,
			label: key,
			question: key,
			answer: value,
		});
	}

	if (fromFields.length > 0) {
		return fromFields;
	}

	// Fallback: pair each assistant turn with the next user reply.
	const segments = [...(session.transcript?.segments ?? [])].sort(
		(a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
	);
	const pairs: UserResponseEntry[] = [];
	let pendingQuestion: string | null = null;
	for (const segment of segments) {
		const text = segment.text?.trim();
		if (!text) {
			continue;
		}
		if (segment.role === "ASSISTANT") {
			pendingQuestion = text;
			continue;
		}
		if (segment.role === "USER" && pendingQuestion) {
			pairs.push({
				question: pendingQuestion,
				answer: text,
			});
			pendingQuestion = null;
		}
	}
	return pairs;
}

/**
 * Run capture post-processing for a completed session.
 * Idempotent while status is running/completed (unless retryForVideo or force).
 */
export async function runPostProcessing(
	sessionId: string,
	opts?: { retryForVideo?: boolean; force?: boolean },
) {
	if (!hasGeminiApiKey()) {
		logger.warn(
			"Skipping post-processing: GOOGLE_GENERATIVE_AI_API_KEY missing",
			{
				sessionId,
			},
		);
		return;
	}

	const session = await getAgentSessionById(sessionId);
	if (!session) {
		return;
	}

	const metadata = asRecord(session.metadata);
	const existing = readExistingResult(metadata);
	if (existing?.status === "running") {
		return;
	}
	if (
		!opts?.force &&
		existing?.status === "completed" &&
		!opts?.retryForVideo
	) {
		return;
	}
	if (!opts?.force && opts?.retryForVideo && existing?.status === "completed") {
		const media = existing.mediaIntegrity?.mediaAvailable;
		const stillNeedsRetry =
			Boolean(existing.videoUnavailable) ||
			!existing.mediaIntegrity ||
			!(media?.userVideo || media?.userAudio || media?.agentAudio);
		if (!stillNeedsRetry) {
			return;
		}
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
	const egressReady = hasCompleteEgress(session.egressJobs ?? []);
	if (!hasAnyCapture(classified) && !egressReady) {
		await persistResult(sessionId, metadata, {
			status: "skipped",
			completedAt: new Date().toISOString(),
			model: config.model,
			error:
				"No face, ID, body captures, or completed egress recordings found for this session.",
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
		const reportImages: ReportImage[] = [];
		let faceMedia: MediaPart | null = null;
		let idCardMedia: MediaPart | null = null;
		let idCardFullMedia: MediaPart | null = null;
		let bodyStill: MediaPart | null = null;

		if (classified.face) {
			faceMedia = await mediaFromFile(
				classified.face.url,
				classified.face.type || "image/jpeg",
			);
			pushReportImage(reportImages, "face", "Face capture", faceMedia);
			result.face = parseFace(
				await generateJsonFromMedia({
					model: config.model,
					prompt: config.prompts.face_liveness,
					media: [faceMedia],
				}),
			);
		}

		if (classified.idCard) {
			idCardMedia = await mediaFromFile(
				classified.idCard.url,
				classified.idCard.type || "image/jpeg",
			);
			pushReportImage(reportImages, "id", "ID card", idCardMedia);
		}
		if (classified.idCardFull) {
			idCardFullMedia = await mediaFromFile(
				classified.idCardFull.url,
				classified.idCardFull.type || "image/jpeg",
			);
			pushReportImage(
				reportImages,
				"id",
				"ID card (full frame)",
				idCardFullMedia,
			);
		}

		const idAnalysisMedia = idCardMedia ?? idCardFullMedia;
		if (idAnalysisMedia) {
			result.idCard = parseIdCard(
				await generateJsonFromMedia({
					model: config.model,
					prompt: config.prompts.id_extraction,
					media: [idAnalysisMedia],
				}),
			);
		}

		if (classified.body) {
			bodyStill = await mediaFromFile(
				classified.body.url,
				classified.body.type || "image/jpeg",
			);
			pushReportImage(reportImages, "body", "Body capture", bodyStill);
			const media: MediaPart[] = [bodyStill];
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
					responseJsonSchema: BODY_ASSESSMENT_RESPONSE_SCHEMA,
					// Slightly higher temp so the model commits to visual estimates
					// instead of refusing with nulls.
					temperature: 0.4,
				}),
			);
			body.videoUnavailable = videoUnavailable || body.videoUnavailable;
			result.body = body;
			result.videoUnavailable = body.videoUnavailable;
		}

		const tracks = await downloadSessionMediaTracks(
			session.egressJobs ?? [],
		);
		const mediaAvailable = {
			userVideo: Boolean(tracks.userVideo),
			userAudio: Boolean(tracks.userAudio),
			agentAudio: Boolean(tracks.agentAudio),
		};
		const integrityMedia: MediaPart[] = [
			tracks.userVideo,
			tracks.userAudio,
			tracks.agentAudio,
		].filter((part): part is MediaPart => Boolean(part));

		if (integrityMedia.length > 0) {
			const mediaLabels = [
				tracks.userVideo ? "user_video" : null,
				tracks.userAudio ? "user_audio" : null,
				tracks.agentAudio ? "agent_audio" : null,
			].filter((label): label is string => Boolean(label));
			const integrityPrompt = `${config.prompts.media_integrity}

Media parts are attached in this order: ${mediaLabels.join(", ")}.
Use startMs/endMs relative to each attached file's own timeline when possible.`;
			result.mediaIntegrity = parseMediaIntegrity(
				await generateJsonFromMedia({
					model: config.model,
					prompt: integrityPrompt,
					media: integrityMedia,
				}),
				mediaAvailable,
			);
			if (result.mediaIntegrity.underwriterReviewRecommended) {
				const flags = result.body?.underwriting.exceptionFlags ?? [];
				if (result.body) {
					result.body.underwriting.exceptionFlags = Array.from(
						new Set([
							...flags,
							"media_integrity_review_recommended",
						]),
					);
					result.body.underwriting.underwriterReviewRecommended =
						true;
				}
			}
		} else if (egressReady || classified.body) {
			result.mediaIntegrity = {
				audioIssues: [],
				videoIssues: [
					{
						label: "recording_unavailable",
						detail:
							"Session recordings were expected but could not be downloaded for integrity review.",
						startMs: null,
						endMs: null,
						severity: "warn",
					},
				],
				multipleVoices: { detected: false, count: null, events: [] },
				multipleUsers: { detected: false, count: null, events: [] },
				deviceDetection: {
					devices: [],
					events: [],
					summary: "No media available for device detection.",
				},
				mediaAvailable,
				summary:
					"Media integrity analysis skipped because no downloadable egress tracks were available.",
				underwriterReviewRecommended: true,
			};
		}

		// Re-fetch so late uploads / collectedData / transcript are included.
		const latestForReport = await getAgentSessionById(sessionId);
		const reportSession = latestForReport ?? session;
		const uploadedResponses = await loadUploadedUserResponses(
			reportSession.files ?? [],
			sessionId,
		);
		const userResponses =
			uploadedResponses.length > 0
				? uploadedResponses
				: buildUserResponses(reportSession);
		const pdf = await buildPostProcessingPdf({
			sessionId: session.id,
			agentName: session.agent?.name,
			endUserName: session.endUser?.name,
			startedAt: session.startedAt,
			endedAt: session.endedAt,
			result,
			images: reportImages,
			userResponses,
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

		const latest =
			latestForReport ?? (await getAgentSessionById(sessionId));
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
export async function runPostProcessingSafe(
	sessionId: string,
	opts?: { retryForVideo?: boolean; force?: boolean },
) {
	try {
		await runPostProcessing(sessionId, opts);
	} catch (error) {
		logger.error("Failed to run post-processing", { sessionId, error });
	}
}

/**
 * Re-run analysis when a prior completed run lacked video / media integrity
 * inputs and egress tracks are now downloadable.
 */
export async function maybeRetryPostProcessingForVideo(sessionId: string) {
	try {
		const session = await getAgentSessionById(sessionId);
		if (!session) {
			return;
		}
		const existing = readExistingResult(asRecord(session.metadata));
		if (!existing || existing.status !== "completed") {
			return;
		}
		const media = existing.mediaIntegrity?.mediaAvailable;
		const needsRetry =
			Boolean(existing.videoUnavailable) ||
			!existing.mediaIntegrity ||
			!(media?.userVideo || media?.userAudio || media?.agentAudio);
		if (!needsRetry) {
			return;
		}
		const tracks = await downloadSessionMediaTracks(
			session.egressJobs ?? [],
		);
		if (!tracks.userVideo && !tracks.userAudio && !tracks.agentAudio) {
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

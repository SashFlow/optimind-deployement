import type {
	AgentSessionChannel,
	AgentSessionDirection,
	AgentSessionStatus,
	Prisma,
	SessionEndReason,
	SessionEventActor,
	ToolCallStatus,
	TranscriptRole,
	TranscriptStatus,
	UnitSource,
	UsageModality,
} from "../generated/client";
import { db } from "../client";

function toJson(value: unknown): Prisma.InputJsonValue {
	return (value ?? {}) as Prisma.InputJsonValue;
}

function clampInt4(value: number | undefined): number | undefined {
	if (value === undefined || !Number.isFinite(value)) return undefined;
	const floored = Math.floor(value);
	if (floored < 0) return 0;
	if (floored > 2_147_483_647) return 2_147_483_647;
	return floored;
}

const sessionDetailInclude = {
	agent: true,
	agentVersion: true,
	transcript: {
		include: { segments: { orderBy: { sequence: "asc" as const } } },
	},
	usages: true,
	egressJobs: { orderBy: { createdAt: "desc" as const } },
	toolCalls: { orderBy: { createdAt: "asc" as const } },
	events: { orderBy: { sequence: "asc" as const }, take: 200 },
	campaignSession: true,
	collectedFields: { orderBy: { capturedAt: "asc" as const } },
	callbackSchedules: { orderBy: { scheduledAt: "desc" as const }, take: 20 },
} satisfies Prisma.AgentSessionInclude;

export async function createAgentSession(data: {
	organizationId: string;
	agentId: string;
	agentVersionId: string;
	livekitRoomName: string;
	livekitRoomSid?: string;
	channel?: AgentSessionChannel;
	direction?: AgentSessionDirection;
	sipTrunkId?: string;
	sipDispatchRuleId?: string;
	sipCallId?: string;
	fromNumber?: string;
	toNumber?: string;
	sipAttrs?: unknown;
	configSnapshot?: unknown;
	recordingEnabled?: boolean;
	externalUserId?: string;
	metadata?: unknown;
	startedAt?: Date;
}) {
	return db.agentSession.create({
		data: {
			organizationId: data.organizationId,
			agentId: data.agentId,
			agentVersionId: data.agentVersionId,
			livekitRoomName: data.livekitRoomName,
			livekitRoomSid: data.livekitRoomSid,
			channel: data.channel ?? "WEB",
			direction: data.direction ?? "NONE",
			sipTrunkId: data.sipTrunkId,
			sipDispatchRuleId: data.sipDispatchRuleId,
			sipCallId: data.sipCallId,
			fromNumber: data.fromNumber,
			toNumber: data.toNumber,
			sipAttrs: toJson(data.sipAttrs),
			configSnapshot: toJson(data.configSnapshot),
			recordingEnabled: data.recordingEnabled ?? false,
			externalUserId: data.externalUserId,
			metadata: toJson(data.metadata),
			status: "QUEUED",
			startedAt: data.startedAt ?? new Date(),
		},
		include: sessionDetailInclude,
	});
}

export async function getAgentSessionById(id: string) {
	return db.agentSession.findUnique({
		where: { id },
		include: sessionDetailInclude,
	});
}

export async function getAgentSessionByRoomName(livekitRoomName: string) {
	return db.agentSession.findFirst({
		where: { livekitRoomName },
		orderBy: { createdAt: "desc" },
		include: sessionDetailInclude,
	});
}

export async function listAgentSessions(
	organizationId: string,
	opts?: {
		agentId?: string;
		status?: AgentSessionStatus;
		take?: number;
		skip?: number;
	},
) {
	return db.agentSession.findMany({
		where: {
			organizationId,
			agentId: opts?.agentId,
			status: opts?.status,
		},
		include: {
			agent: true,
			agentVersion: true,
			transcript: true,
			egressJobs: { take: 5, orderBy: { createdAt: "desc" } },
		},
		orderBy: { createdAt: "desc" },
		take: opts?.take ?? 50,
		skip: opts?.skip ?? 0,
	});
}

export async function updateAgentSessionLifecycle(
	id: string,
	data: {
		status: AgentSessionStatus;
		livekitJobId?: string;
		livekitWorkerId?: string;
		livekitRoomSid?: string;
		endReason?: SessionEndReason;
		errorCode?: string;
		errorMessage?: string;
	},
) {
	const existing = await db.agentSession.findUnique({ where: { id } });
	if (!existing) return null;

	const now = new Date();
	const patch: Prisma.AgentSessionUpdateInput = {
		status: data.status,
	};

	if (data.livekitJobId !== undefined) patch.livekitJobId = data.livekitJobId;
	if (data.livekitWorkerId !== undefined) {
		patch.livekitWorkerId = data.livekitWorkerId;
	}
	if (data.livekitRoomSid !== undefined) {
		patch.livekitRoomSid = data.livekitRoomSid;
	}
	if (data.endReason !== undefined) patch.endReason = data.endReason;
	if (data.errorCode !== undefined) patch.errorCode = data.errorCode;
	if (data.errorMessage !== undefined) {
		patch.errorMessage = data.errorMessage;
	}

	if (data.status === "ACTIVE" && !existing.connectedAt) {
		patch.connectedAt = now;
	}

	if (
		data.status === "COMPLETED" ||
		data.status === "FAILED" ||
		data.status === "CANCELLED"
	) {
		patch.endedAt = now;
		const start = existing.startedAt ?? existing.createdAt;
		patch.durationMs = Math.max(0, now.getTime() - start.getTime());
	}

	return db.agentSession.update({
		where: { id },
		data: patch,
		include: sessionDetailInclude,
	});
}

export async function createSessionEvent(data: {
	organizationId: string;
	sessionId: string;
	eventType: string;
	actor?: SessionEventActor;
	payload?: unknown;
	occurredAt?: Date;
}) {
	const payload = toJson(data.payload);
	const actor = data.actor ?? "AGENT";
	const occurredAt = data.occurredAt ?? new Date();

	// Concurrent worker events can race on (sessionId, sequence); retry on conflict.
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			return await db.$transaction(async (tx) => {
				const last = await tx.sessionEvent.findFirst({
					where: { sessionId: data.sessionId },
					orderBy: { sequence: "desc" },
					select: { sequence: true },
				});
				const sequence = (last?.sequence ?? 0) + 1;

				return tx.sessionEvent.create({
					data: {
						organizationId: data.organizationId,
						sessionId: data.sessionId,
						sequence,
						eventType: data.eventType,
						actor,
						payload,
						occurredAt,
					},
				});
			});
		} catch (error) {
			const code =
				error && typeof error === "object" && "code" in error
					? String((error as { code?: unknown }).code)
					: "";
			if (code !== "P2002" || attempt === 4) throw error;
		}
	}

	throw new Error("Failed to create session event after retries");
}

export async function createToolCallRecord(data: {
	organizationId: string;
	sessionId: string;
	toolName: string;
	arguments?: unknown;
	result?: unknown;
	status?: ToolCallStatus;
	error?: string;
	transcriptSegmentId?: string;
}) {
	const now = new Date();
	return db.toolCallRecord.create({
		data: {
			organizationId: data.organizationId,
			sessionId: data.sessionId,
			toolName: data.toolName,
			arguments: toJson(data.arguments),
			result: toJson(data.result),
			status: data.status ?? "COMPLETED",
			error: data.error,
			transcriptSegmentId: data.transcriptSegmentId,
			startedAt: now,
			completedAt: now,
		},
	});
}

export type TranscriptSegmentInput = {
	sequence: number;
	role: TranscriptRole;
	text: string;
	speakerIdentity?: string;
	startMs?: number;
	endMs?: number;
	confidence?: number;
	isFinal?: boolean;
	interrupted?: boolean;
	livekitMessageId?: string;
	metrics?: unknown;
};

export async function upsertTranscriptFromHistory(data: {
	organizationId: string;
	sessionId: string;
	agentId: string;
	status?: TranscriptStatus;
	language?: string;
	segments: TranscriptSegmentInput[];
}) {
	const fullText = data.segments
		.map((s) => s.text)
		.filter(Boolean)
		.join("\n");
	const wordCount = fullText.split(/\s+/).filter((w) => w.length > 0).length;
	const status = data.status ?? "FINAL";

	return db.$transaction(async (tx) => {
		const transcript = await tx.transcript.upsert({
			where: { sessionId: data.sessionId },
			create: {
				organizationId: data.organizationId,
				sessionId: data.sessionId,
				agentId: data.agentId,
				language: data.language,
				status,
				fullText,
				wordCount,
			},
			update: {
				language: data.language,
				status,
				fullText,
				wordCount,
			},
		});

		await tx.transcriptSegment.deleteMany({
			where: { transcriptId: transcript.id },
		});

		if (data.segments.length > 0) {
			await tx.transcriptSegment.createMany({
				data: data.segments.map((s) => ({
					transcriptId: transcript.id,
					sessionId: data.sessionId,
					sequence: s.sequence,
					role: s.role,
					speakerIdentity: s.speakerIdentity,
					text: s.text,
					startMs: clampInt4(s.startMs),
					endMs: clampInt4(s.endMs),
					confidence: s.confidence,
					isFinal: s.isFinal ?? true,
					interrupted: s.interrupted ?? false,
					livekitMessageId: s.livekitMessageId,
					metrics: toJson(s.metrics),
				})),
			});
		}

		await tx.agentSession.update({
			where: { id: data.sessionId },
			data: { transcriptStatus: status },
		});

		return tx.transcript.findUnique({
			where: { id: transcript.id },
			include: { segments: { orderBy: { sequence: "asc" } } },
		});
	});
}

export async function upsertSessionUsage(data: {
	organizationId: string;
	sessionId: string;
	agentId: string;
	modality: UsageModality;
	provider: string;
	model: string;
	unitSource?: UnitSource;
	inputTokens?: number;
	inputCachedTokens?: number;
	inputCachedAudioTokens?: number;
	inputCachedTextTokens?: number;
	inputCachedImageTokens?: number;
	inputAudioTokens?: number;
	inputTextTokens?: number;
	inputImageTokens?: number;
	outputTokens?: number;
	outputAudioTokens?: number;
	outputTextTokens?: number;
	providerSessionDurationMs?: number;
	charactersCount?: number;
	audioDurationMs?: number;
	totalRequests?: number;
	videoDurationMs?: number;
	callDurationMs?: number;
	billableMinutes?: number;
	participantMinutes?: number;
	egressMinutes?: number;
	egressBytes?: number;
	raw?: unknown;
	isFinal?: boolean;
	capturedAt?: Date;
}) {
	const {
		organizationId,
		sessionId,
		agentId,
		modality,
		provider,
		model,
		unitSource,
		raw,
		isFinal,
		capturedAt,
		...metrics
	} = data;

	return db.sessionUsage.upsert({
		where: {
			sessionId_modality_provider_model: {
				sessionId,
				modality,
				provider,
				model,
			},
		},
		create: {
			organizationId,
			sessionId,
			agentId,
			modality,
			provider,
			model,
			unitSource: unitSource ?? "LIVEKIT_INFERENCE",
			...metrics,
			raw: toJson(raw),
			isFinal: isFinal ?? false,
			capturedAt: capturedAt ?? new Date(),
		},
		update: {
			...metrics,
			unitSource: unitSource ?? "LIVEKIT_INFERENCE",
			raw: toJson(raw),
			isFinal: isFinal ?? false,
			capturedAt: capturedAt ?? new Date(),
		},
	});
}

export async function saveAgentSessionReport(
	id: string,
	data: {
		report: unknown;
		usage?: unknown;
		metadataPatch?: unknown;
		mergeReport?: boolean;
	},
) {
	const existing = await db.agentSession.findUnique({ where: { id } });
	if (!existing) return null;

	const metadata = toJson({
		...((existing.metadata as Record<string, unknown>) ?? {}),
		...((data.metadataPatch as Record<string, unknown>) ?? {}),
		...(data.usage ? { session_usage: data.usage } : {}),
	});

	let reportToStore = data.report;
	if (data.mergeReport !== false) {
		const existingReport = existing.livekitSessionReport;
		const incoming = data.report;
		const incomingRecord =
			incoming && typeof incoming === "object" && !Array.isArray(incoming)
				? (incoming as Record<string, unknown>)
				: {};
		const isStub =
			incomingRecord.metrics_flush === true ||
			Object.keys(incomingRecord).length === 0 ||
			Object.keys(incomingRecord).every(
				(k) => k === "metrics_flush" || k === "metrics",
			);

		if (
			isStub &&
			existingReport &&
			typeof existingReport === "object" &&
			!Array.isArray(existingReport)
		) {
			const prev = existingReport as Record<string, unknown>;
			const mergedMetrics = [
				...(Array.isArray(prev.metrics) ? prev.metrics : []),
				...(Array.isArray(incomingRecord.metrics)
					? incomingRecord.metrics
					: []),
			];
			reportToStore = {
				...prev,
				...(mergedMetrics.length ? { metrics: mergedMetrics } : {}),
			};
		} else if (
			existingReport &&
			typeof existingReport === "object" &&
			!Array.isArray(existingReport)
		) {
			const prev = existingReport as Record<string, unknown>;
			const next = incomingRecord;
			const prevHistory =
				prev.chat_history &&
				typeof prev.chat_history === "object" &&
				!Array.isArray(prev.chat_history)
					? (prev.chat_history as Record<string, unknown>)
					: null;
			const nextHistory =
				next.chat_history &&
				typeof next.chat_history === "object" &&
				!Array.isArray(next.chat_history)
					? (next.chat_history as Record<string, unknown>)
					: null;
			const nextItems = Array.isArray(nextHistory?.items)
				? nextHistory.items
				: null;
			reportToStore = {
				...prev,
				...next,
				chat_history:
					nextItems && nextItems.length > 0
						? nextHistory
						: (prevHistory ??
							next.chat_history ??
							prev.chat_history),
				events:
					Array.isArray(next.events) && next.events.length > 0
						? next.events
						: (prev.events ?? next.events),
				usage: next.usage ?? prev.usage,
			};
		}
	}

	return db.agentSession.update({
		where: { id },
		data: {
			livekitSessionReport: toJson(reportToStore),
			metadata,
		},
		include: sessionDetailInclude,
	});
}

export async function linkCampaignSessionToAgentSession(
	campaignSessionId: string,
	agentSessionId: string,
) {
	return db.campaignSession.update({
		where: { id: campaignSessionId },
		data: { agentSessionId },
	});
}

/**
 * Sync CampaignSession outcome/recording/duration from a terminal AgentSession.
 */
export async function syncCampaignSessionFromAgentSession(
	agentSessionId: string,
) {
	const session = await db.agentSession.findUnique({
		where: { id: agentSessionId },
		include: {
			campaignSession: true,
			transcript: {
				include: {
					segments: { orderBy: { sequence: "asc" } },
				},
			},
			egressJobs: { orderBy: { createdAt: "desc" } },
			events: {
				where: {
					eventType: {
						in: [
							"transfer_started",
							"amd_result",
							"reschedule_requested",
							"voicemail_retry_scheduled",
							"end_call",
						],
					},
				},
				orderBy: { sequence: "asc" },
			},
		},
	});

	if (!session?.campaignSession) return null;

	const cs = session.campaignSession;
	const durationSeconds =
		session.durationMs != null
			? Math.round(session.durationMs / 1000)
			: cs.durationSeconds;

	let campaignStatus:
		| "COMPLETED"
		| "FAILED"
		| "ABANDONED"
		| "RESCHEDULED"
		| "IN_PROGRESS" = "IN_PROGRESS";
	if (session.status === "COMPLETED") campaignStatus = "COMPLETED";
	else if (session.status === "FAILED") campaignStatus = "FAILED";
	else if (session.status === "CANCELLED") campaignStatus = "ABANDONED";

	let outcome =
		session.endReason?.toLowerCase() ??
		session.status.toLowerCase() ??
		null;

	for (const event of session.events) {
		if (event.eventType === "transfer_started") outcome = "transferred";
		if (event.eventType === "reschedule_requested") {
			outcome = "rescheduled";
			campaignStatus = "RESCHEDULED";
		}
		if (event.eventType === "voicemail_retry_scheduled") {
			outcome = "voicemail";
			campaignStatus = "RESCHEDULED";
		}
		if (event.eventType === "amd_result") {
			const payload =
				event.payload &&
				typeof event.payload === "object" &&
				!Array.isArray(event.payload)
					? (event.payload as Record<string, unknown>)
					: {};
			const category =
				typeof payload.category === "string"
					? payload.category
					: null;
			if (category) outcome = `amd:${category}`;
		}
		if (event.eventType === "end_call") outcome = "completed";
	}

	const recordingUrl =
		session.egressJobs.find(
			(j) => j.status === "COMPLETE" && (j.fileUrl || j.outputUrls[0]),
		)?.fileUrl ??
		session.egressJobs.find((j) => j.outputUrls[0])?.outputUrls[0] ??
		cs.recordingUrl;

	const messages = session.transcript?.segments.map((seg) => ({
		role: seg.role,
		text: seg.text,
		startMs: seg.startMs,
		endMs: seg.endMs,
	}));

	const updated = await db.campaignSession.update({
		where: { id: cs.id },
		data: {
			status: campaignStatus,
			endedAt: session.endedAt ?? new Date(),
			durationSeconds: durationSeconds ?? undefined,
			outcome,
			transcript: session.transcript?.fullText
				? { fullText: session.transcript.fullText }
				: undefined,
			messages: messages ? toJson(messages) : undefined,
			recordingUrl: recordingUrl ?? undefined,
			egressId:
				session.egressJobs[0]?.livekitEgressId ?? cs.egressId ?? undefined,
			egressStatus: session.egressJobs[0]?.status ?? cs.egressStatus ?? undefined,
		},
	});

	if (cs.contactId && outcome) {
		const contactStatus =
			campaignStatus === "RESCHEDULED"
				? ("RESCHEDULED" as const)
				: campaignStatus === "COMPLETED"
					? ("COMPLETED" as const)
					: campaignStatus === "FAILED"
						? ("FAILED" as const)
						: undefined;
		await db.campaignContact.update({
			where: { id: cs.contactId },
			data: {
				lastOutcome: outcome,
				...(contactStatus ? { status: contactStatus } : {}),
			},
		});
	}

	return updated;
}

export async function getEgressJobByLivekitId(livekitEgressId: string) {
	return db.egressJob.findFirst({
		where: { livekitEgressId },
		orderBy: { createdAt: "desc" },
	});
}

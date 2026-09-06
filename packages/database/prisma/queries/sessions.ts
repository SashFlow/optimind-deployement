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
	const last = await db.sessionEvent.findFirst({
		where: { sessionId: data.sessionId },
		orderBy: { sequence: "desc" },
		select: { sequence: true },
	});
	const sequence = (last?.sequence ?? 0) + 1;

	return db.sessionEvent.create({
		data: {
			organizationId: data.organizationId,
			sessionId: data.sessionId,
			sequence,
			eventType: data.eventType,
			actor: data.actor ?? "AGENT",
			payload: toJson(data.payload),
			occurredAt: data.occurredAt ?? new Date(),
		},
	});
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
					startMs: s.startMs,
					endMs: s.endMs,
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
	},
) {
	const existing = await db.agentSession.findUnique({ where: { id } });
	if (!existing) return null;

	const metadata = toJson({
		...((existing.metadata as Record<string, unknown>) ?? {}),
		...((data.metadataPatch as Record<string, unknown>) ?? {}),
		...(data.usage ? { session_usage: data.usage } : {}),
	});

	return db.agentSession.update({
		where: { id },
		data: {
			livekitSessionReport: toJson(data.report),
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

export async function getEgressJobByLivekitId(livekitEgressId: string) {
	return db.egressJob.findFirst({
		where: { livekitEgressId },
		orderBy: { createdAt: "desc" },
	});
}

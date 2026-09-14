import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import type {
	AgentSessionChannel,
	AgentSessionDirection,
	AgentSessionStatus,
	EgressJobType,
	Prisma,
	SessionEndReason,
	TranscriptRole,
} from "../generated/client";
import { createAgent } from "./agents";

const DEMO_FILL_KEY = "demoFill";
const TARGET_SESSIONS = 150;
const DAYS = 30;

const PHONE_NUMBERS = [
	"+14155550101",
	"+14155550102",
	"+14155550103",
	"+12125550111",
	"+13105550122",
];

const TOOL_NAMES = [
	"lookup_customer",
	"schedule_callback",
	"transfer_call",
	"end_call",
];

function rand(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
	return items[rand(0, items.length - 1)] as T;
}

function chance(p: number) {
	return Math.random() < p;
}

function weekdayBias(dayOfWeek: number) {
	// 0 = Sunday … 6 = Saturday
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		return 0.45;
	}
	return 1;
}

function toJson(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

type SessionPlan = {
	id: string;
	createdAt: Date;
	channel: AgentSessionChannel;
	direction: AgentSessionDirection;
	status: AgentSessionStatus;
	startedAt: Date | null;
	connectedAt: Date | null;
	endedAt: Date | null;
	durationMs: number | null;
	endReason: SessionEndReason | null;
	errorCode: string | null;
	errorMessage: string | null;
	fromNumber: string | null;
	toNumber: string | null;
	livekitRoomName: string;
};

function buildSessionPlan(dayOffset: number, slot: number): SessionPlan {
	const createdAt = new Date();
	createdAt.setUTCDate(createdAt.getUTCDate() - dayOffset);
	createdAt.setUTCHours(rand(8, 20), rand(0, 59), rand(0, 59), 0);
	// Spread slots within the hour
	createdAt.setUTCMinutes((createdAt.getUTCMinutes() + slot * 7) % 60);

	const channel = pick<AgentSessionChannel>(["WEB", "SIP", "PHONE", "SIP"]);
	const direction: AgentSessionDirection =
		channel === "WEB"
			? "WEB"
			: pick<AgentSessionDirection>(["INBOUND", "OUTBOUND"]);

	const roll = Math.random();
	let status: AgentSessionStatus;
	if (roll < 0.8) {
		status = "COMPLETED";
	} else if (roll < 0.92) {
		status = "FAILED";
	} else if (roll < 0.97) {
		status = "CANCELLED";
	} else {
		status = chance(0.5) ? "ACTIVE" : "QUEUED";
	}

	const startedAt =
		status === "QUEUED"
			? null
			: new Date(createdAt.getTime() + rand(200, 2_000));
	const connectDelay = rand(400, 4_500);
	const connectedAt =
		startedAt && status !== "QUEUED" && status !== "CANCELLED"
			? new Date(startedAt.getTime() + connectDelay)
			: null;

	let durationMs: number | null = null;
	let endedAt: Date | null = null;
	let endReason: SessionEndReason | null = null;
	let errorCode: string | null = null;
	let errorMessage: string | null = null;

	if (status === "COMPLETED") {
		durationMs = rand(25_000, 420_000);
		endedAt = new Date(
			(connectedAt ?? startedAt ?? createdAt).getTime() + durationMs,
		);
		endReason = pick<SessionEndReason>([
			"COMPLETED",
			"PARTICIPANT_LEFT",
			"ROOM_FINISHED",
		]);
	} else if (status === "FAILED") {
		durationMs = rand(1_000, 45_000);
		endedAt = new Date(
			(connectedAt ?? startedAt ?? createdAt).getTime() + durationMs,
		);
		endReason = "ERROR";
		errorCode = pick(["SIP_BUSY", "AGENT_CRASH", "TIMEOUT", "MEDIA_ERROR"]);
		errorMessage = `Demo failure: ${errorCode}`;
	} else if (status === "CANCELLED") {
		durationMs = rand(500, 8_000);
		endedAt = new Date((startedAt ?? createdAt).getTime() + durationMs);
		endReason = "CANCELLED";
	} else if (status === "ACTIVE" && connectedAt) {
		durationMs = rand(10_000, 120_000);
	}

	const isPhone = channel === "SIP" || channel === "PHONE";
	const fromNumber = isPhone ? pick(PHONE_NUMBERS) : null;
	const toNumber = isPhone
		? pick(PHONE_NUMBERS.filter((n) => n !== fromNumber))
		: null;

	return {
		id: createId(),
		createdAt,
		channel,
		direction,
		status,
		startedAt,
		connectedAt,
		endedAt,
		durationMs,
		endReason,
		errorCode,
		errorMessage,
		fromNumber,
		toNumber,
		livekitRoomName: `demo-room-${createId().slice(0, 12)}`,
	};
}

async function ensureDemoProviderRates(organizationId: string) {
	const existing = await db.providerRate.count({
		where: {
			OR: [{ organizationId }, { organizationId: null }],
		},
	});
	if (existing > 0) {
		return;
	}

	await db.providerRate.createMany({
		data: [
			{
				organizationId,
				modality: "LLM",
				provider: "openai",
				model: null,
				unit: "TOKEN",
				unitAmountMicros: 5,
			},
			{
				organizationId,
				modality: "TTS",
				provider: "elevenlabs",
				model: null,
				unit: "CHARACTER",
				unitAmountMicros: 30,
			},
			{
				organizationId,
				modality: "STT",
				provider: "deepgram",
				model: null,
				unit: "MINUTE",
				unitAmountMicros: 4300,
			},
		],
	});
}

async function resolveDemoAgent(organizationId: string) {
	const existing = await db.agent.findFirst({
		where: { organizationId, status: { not: "DELETED" } },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			draftVersionId: true,
			publishedVersionId: true,
		},
	});

	if (existing) {
		const agentVersionId =
			existing.publishedVersionId ?? existing.draftVersionId;
		if (!agentVersionId) {
			throw new Error("Agent has no draft or published version");
		}
		return {
			agentId: existing.id,
			agentVersionId,
			agentCreated: false,
		};
	}

	const agent = await createAgent({
		organizationId,
		name: "Demo Agent",
		description: "Auto-created for dashboard demo data",
	});
	const agentVersionId = agent.publishedVersionId ?? agent.draftVersionId;
	if (!agentVersionId) {
		throw new Error("Failed to create demo agent version");
	}
	return {
		agentId: agent.id,
		agentVersionId,
		agentCreated: true,
	};
}

async function deletePriorDemoSessions(organizationId: string) {
	await db.agentSession.deleteMany({
		where: {
			organizationId,
			metadata: {
				path: [DEMO_FILL_KEY],
				equals: true,
			},
		},
	});
}

export async function fillOrganizationDemoDashboardData(
	organizationId: string,
) {
	const org = await db.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});
	if (!org) {
		throw new Error("Organization not found");
	}

	const { agentId, agentVersionId, agentCreated } =
		await resolveDemoAgent(organizationId);

	await deletePriorDemoSessions(organizationId);
	await ensureDemoProviderRates(organizationId);

	const plans: SessionPlan[] = [];
	for (let day = 0; day < DAYS; day += 1) {
		const date = new Date();
		date.setUTCDate(date.getUTCDate() - day);
		const bias = weekdayBias(date.getUTCDay());
		const perDay = Math.max(1, Math.round((TARGET_SESSIONS / DAYS) * bias));
		for (let slot = 0; slot < perDay; slot += 1) {
			plans.push(buildSessionPlan(day, slot));
		}
	}

	// Trim or pad toward target
	while (plans.length > TARGET_SESSIONS + 30) {
		plans.pop();
	}
	while (plans.length < TARGET_SESSIONS - 20) {
		plans.push(buildSessionPlan(rand(0, DAYS - 1), plans.length));
	}

	await db.agentSession.createMany({
		data: plans.map((p) => ({
			id: p.id,
			createdAt: p.createdAt,
			updatedAt: p.createdAt,
			organizationId,
			agentId,
			agentVersionId,
			livekitRoomName: p.livekitRoomName,
			channel: p.channel,
			direction: p.direction,
			status: p.status,
			startedAt: p.startedAt,
			connectedAt: p.connectedAt,
			endedAt: p.endedAt,
			durationMs: p.durationMs,
			endReason: p.endReason,
			errorCode: p.errorCode,
			errorMessage: p.errorMessage,
			fromNumber: p.fromNumber,
			toNumber: p.toNumber,
			transcriptStatus: p.status === "COMPLETED" ? "FINAL" : "PENDING",
			metadata: toJson({ [DEMO_FILL_KEY]: true }),
		})),
	});

	const completed = plans.filter((p) => p.status === "COMPLETED");
	const usageRows: Prisma.SessionUsageCreateManyInput[] = [];
	const transcriptRows: Prisma.TranscriptCreateManyInput[] = [];
	const segmentRows: Prisma.TranscriptSegmentCreateManyInput[] = [];
	const eventRows: Prisma.SessionEventCreateManyInput[] = [];
	const toolRows: Prisma.ToolCallRecordCreateManyInput[] = [];
	const egressRows: Prisma.EgressJobCreateManyInput[] = [];

	for (const session of completed) {
		const capturedAt = session.endedAt ?? session.createdAt;
		const durationMs = session.durationMs ?? 60_000;

		usageRows.push(
			{
				organizationId,
				sessionId: session.id,
				agentId,
				modality: "LLM",
				provider: "openai",
				model: "gpt-4o",
				inputTokens: rand(800, 4_500),
				outputTokens: rand(200, 1_800),
				totalRequests: rand(3, 18),
				capturedAt,
				isFinal: true,
			},
			{
				organizationId,
				sessionId: session.id,
				agentId,
				modality: "STT",
				provider: "deepgram",
				model: "nova-3",
				audioDurationMs: Math.round(durationMs * 0.55),
				totalRequests: rand(1, 4),
				capturedAt,
				isFinal: true,
			},
			{
				organizationId,
				sessionId: session.id,
				agentId,
				modality: "TTS",
				provider: "elevenlabs",
				model: "default",
				charactersCount: rand(400, 3_200),
				audioDurationMs: Math.round(durationMs * 0.4),
				totalRequests: rand(2, 12),
				capturedAt,
				isFinal: true,
			},
		);

		const transcriptId = createId();
		const lines = [
			{
				role: "ASSISTANT" as TranscriptRole,
				text: "Hi, thanks for calling. How can I help you today?",
			},
			{
				role: "USER" as TranscriptRole,
				text: "I need to check my appointment status.",
			},
			{
				role: "ASSISTANT" as TranscriptRole,
				text: "Sure — I can look that up. One moment.",
			},
			{
				role: "USER" as TranscriptRole,
				text: "Great, thanks.",
			},
		];
		const fullText = lines.map((l) => l.text).join(" ");
		transcriptRows.push({
			id: transcriptId,
			createdAt: session.createdAt,
			updatedAt: capturedAt,
			organizationId,
			sessionId: session.id,
			agentId,
			language: "en",
			status: "FINAL",
			fullText,
			wordCount: fullText.split(/\s+/).filter(Boolean).length,
		});

		let cursorMs = 0;
		for (let i = 0; i < lines.length; i += 1) {
			const line = lines[i];
			if (!line) {
				continue;
			}
			const startMs = cursorMs;
			const endMs = startMs + rand(1_200, 4_500);
			cursorMs = endMs + rand(200, 800);
			segmentRows.push({
				id: createId(),
				transcriptId,
				sessionId: session.id,
				sequence: i,
				role: line.role,
				text: line.text,
				startMs,
				endMs,
				confidence: 0.85 + Math.random() * 0.12,
				isFinal: true,
				interrupted: chance(0.08),
			});
		}

		let seq = 0;
		eventRows.push({
			organizationId,
			sessionId: session.id,
			sequence: seq++,
			eventType: "agent.metric.ttft",
			actor: "SYSTEM",
			occurredAt: session.connectedAt ?? session.createdAt,
			payload: toJson({ ttft_ms: rand(180, 900) }),
		});
		eventRows.push({
			organizationId,
			sessionId: session.id,
			sequence: seq++,
			eventType: "agent.metric.llm_latency",
			actor: "SYSTEM",
			occurredAt: session.connectedAt ?? session.createdAt,
			payload: toJson({ duration_ms: rand(220, 1_400) }),
		});
		eventRows.push({
			organizationId,
			sessionId: session.id,
			sequence: seq++,
			eventType: "end_call",
			actor: "AGENT",
			occurredAt: capturedAt,
			payload: toJson({ reason: session.endReason ?? "COMPLETED" }),
		});

		if (chance(0.18)) {
			eventRows.push({
				organizationId,
				sessionId: session.id,
				sequence: seq++,
				eventType: "transfer_started",
				actor: "AGENT",
				occurredAt: capturedAt,
				payload: toJson({ target: "human_queue" }),
			});
		}
		if (chance(0.12)) {
			eventRows.push({
				organizationId,
				sessionId: session.id,
				sequence: seq++,
				eventType: "amd_result",
				actor: "SYSTEM",
				occurredAt: session.connectedAt ?? session.createdAt,
				payload: toJson({
					category: pick(["human", "machine", "unknown"]),
				}),
			});
		}
		if (chance(0.1)) {
			eventRows.push({
				organizationId,
				sessionId: session.id,
				sequence: seq++,
				eventType: "reschedule_requested",
				actor: "USER",
				occurredAt: capturedAt,
				payload: toJson({}),
			});
		}
		if (chance(0.08)) {
			eventRows.push({
				organizationId,
				sessionId: session.id,
				sequence: seq++,
				eventType: "voicemail_retry_scheduled",
				actor: "SYSTEM",
				occurredAt: capturedAt,
				payload: toJson({}),
			});
		}

		const toolCount = rand(1, 3);
		for (let t = 0; t < toolCount; t += 1) {
			const started = new Date(
				(session.connectedAt ?? session.createdAt).getTime() +
					t * 5_000,
			);
			const completedAt = new Date(started.getTime() + rand(80, 1_200));
			const failed = chance(0.12);
			toolRows.push({
				organizationId,
				sessionId: session.id,
				toolName: pick(TOOL_NAMES),
				status: failed ? "FAILED" : "COMPLETED",
				error: failed ? "Demo tool failure" : null,
				startedAt: started,
				completedAt,
				createdAt: started,
				arguments: toJson({}),
				result: toJson(failed ? {} : { ok: true }),
			});
		}

		if (chance(0.35)) {
			const type = pick<EgressJobType>([
				"PARTICIPANT",
				"ROOM_COMPOSITE",
				"TRACK",
				"WEB",
			]);
			egressRows.push({
				organizationId,
				agentSessionId: session.id,
				agentId,
				type,
				status: chance(0.9) ? "COMPLETE" : "FAILED",
				roomName: session.livekitRoomName,
				durationMs: Math.round(
					durationMs * (0.6 + Math.random() * 0.4),
				),
				sizeBytes: rand(250_000, 8_000_000),
				errorMessage: chance(0.1) ? "Demo egress failure" : null,
				createdAt: session.createdAt,
				updatedAt: capturedAt,
				metadata: toJson({ [DEMO_FILL_KEY]: true }),
			});
		}
	}

	// Also attach a few failure events for FAILED sessions
	for (const session of plans.filter((p) => p.status === "FAILED")) {
		eventRows.push({
			organizationId,
			sessionId: session.id,
			sequence: 0,
			eventType: "end_call",
			actor: "SYSTEM",
			occurredAt: session.endedAt ?? session.createdAt,
			payload: toJson({ reason: "ERROR", code: session.errorCode }),
		});
	}

	const chunk = async <T>(
		rows: T[],
		write: (batch: T[]) => Promise<unknown>,
		size = 200,
	) => {
		for (let i = 0; i < rows.length; i += size) {
			await write(rows.slice(i, i + size));
		}
	};

	await chunk(usageRows, (data) => db.sessionUsage.createMany({ data }));
	await chunk(transcriptRows, (data) => db.transcript.createMany({ data }));
	await chunk(segmentRows, (data) =>
		db.transcriptSegment.createMany({ data }),
	);
	await chunk(eventRows, (data) => db.sessionEvent.createMany({ data }));
	await chunk(toolRows, (data) => db.toolCallRecord.createMany({ data }));
	await chunk(egressRows, (data) => db.egressJob.createMany({ data }));

	return {
		sessionsCreated: plans.length,
		agentId,
		agentCreated,
	};
}

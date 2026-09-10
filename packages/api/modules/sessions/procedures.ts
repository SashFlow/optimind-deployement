import { ORPCError } from "@orpc/client";
import {
	consumeAgentTrialToken,
	createAgentSession,
	createEgressJob,
	createSessionEvent,
	createToolCallRecord,
	getAgentById,
	getAgentTrialByToken,
	getAgentSessionById,
	linkCampaignSessionToAgentSession,
	listAgentSessions,
	saveAgentSessionReport,
	updateAgentSessionLifecycle,
} from "@repo/database";
import {
	createOutboundRoomWithDispatch,
	createParticipantToken,
	deleteRoom,
	getEgressS3Config,
	getLiveKitConfig,
	recordingFilepath,
	startRoomCompositeEgress,
} from "@repo/livekit";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	buildDispatchMetadata,
	serializeDispatchMetadata,
} from "./lib/dispatch-metadata";
import {
	inferEgressContentType,
	resolveEgressPlayableUrl,
} from "./lib/egress-media-url";
import {
	isMetricsOnlyReport,
	persistSessionArtifacts,
} from "./lib/normalize-report";
import { workerProcedure } from "./lib/worker-procedure";

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	const c = config as {
		recording_enabled?: boolean;
		recordingEnabled?: boolean;
	};
	return Boolean(c.recording_enabled ?? c.recordingEnabled);
}

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/sessions",
		tags: ["Sessions"],
		summary: "List agent sessions",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string().optional(),
			status: z
				.enum(["QUEUED", "ACTIVE", "COMPLETED", "FAILED", "CANCELLED"])
				.optional(),
			take: z.number().int().min(1).max(100).optional(),
			skip: z.number().int().min(0).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const sessions = await listAgentSessions(input.organizationId, input);
		return { sessions };
	});

export const get = protectedProcedure
	.route({
		method: "GET",
		path: "/sessions/{id}",
		tags: ["Sessions"],
		summary: "Get agent session with artifacts",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(session.organizationId, context.user.id);

		const egressJobs = await Promise.all(
			session.egressJobs.map(async (job) => {
				const meta =
					job.metadata &&
					typeof job.metadata === "object" &&
					!Array.isArray(job.metadata)
						? (job.metadata as Record<string, unknown>)
						: {};
				const audioOnly =
					typeof meta.audioOnly === "boolean"
						? meta.audioOnly
						: session.channel === "SIP" ||
							session.channel === "PHONE";
				const enriched = {
					...job,
					metadata: { ...meta, audioOnly },
				};
				return {
					...enriched,
					audioOnly,
					playableContentType: inferEgressContentType(enriched),
					playableUrl: await resolveEgressPlayableUrl(enriched),
				};
			}),
		);

		return {
			session: {
				...session,
				egressJobs,
			},
		};
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/sessions",
		tags: ["Sessions"],
		summary: "Create LiveKit agent session + room dispatch",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string(),
			agentVersionId: z.string().optional(),
			channel: z.enum(["WEB", "SIP", "PHONE"]).default("WEB"),
			direction: z
				.enum(["NONE", "INBOUND", "OUTBOUND", "WEB"])
				.default("NONE"),
			recordingEnabled: z.boolean().optional(),
			phoneNumber: z.string().optional(),
			fromNumber: z.string().optional(),
			sipTrunkId: z.string().optional(),
			livekitSipTrunkId: z.string().optional(),
			campaignId: z.string().optional(),
			campaignContactId: z.string().optional(),
			campaignSessionId: z.string().optional(),
			source: z
				.enum(["web", "campaign", "reschedule", "inbound", "phone"])
				.default("web"),
			participantName: z.string().default("user"),
			contactMetadata: z.record(z.string(), z.unknown()).optional(),
			roomName: z.string().optional(),
			agentName: z.string().optional(),
			mintParticipantToken: z.boolean().default(true),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const agent = await getAgentById(input.agentId);
		if (!agent || agent.organizationId !== input.organizationId) {
			throw new ORPCError("NOT_FOUND", { message: "Agent not found" });
		}

		const version = input.agentVersionId
			? [agent.draftVersion, agent.publishedVersion].find(
					(item) => item?.id === input.agentVersionId,
				)
			: (agent.publishedVersion ?? agent.draftVersion);
		if (!version) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Agent has no version to dispatch",
			});
		}

		const configSnapshot =
			(version.config as Record<string, unknown>) ?? {};
		const recordingEnabled =
			input.recordingEnabled ?? configRecordingEnabled(configSnapshot);

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const roomName =
			input.roomName ??
			`SESSION_${timestamp}_${Math.floor(Math.random() * 10_000)}`;

		const session = await createAgentSession({
			organizationId: input.organizationId,
			agentId: agent.id,
			agentVersionId: version.id,
			livekitRoomName: roomName,
			channel: input.channel,
			direction: input.direction,
			sipTrunkId: input.sipTrunkId,
			fromNumber: input.fromNumber,
			toNumber: input.phoneNumber,
			configSnapshot,
			recordingEnabled,
			metadata: {
				source: input.source,
				campaignId: input.campaignId,
				campaignContactId: input.campaignContactId,
			},
		});

		if (input.campaignSessionId) {
			await linkCampaignSessionToAgentSession(
				input.campaignSessionId,
				session.id,
			);
		}

		const dispatchMetadata = await buildDispatchMetadata({
			organization_id: input.organizationId,
			agent_id: agent.id,
			agent_version_id: version.id,
			session_id: session.id,
			config: configSnapshot,
			source: input.source,
			campaign_id: input.campaignId ?? null,
			campaign_contact_id: input.campaignContactId ?? null,
			phone_number: input.phoneNumber ?? null,
			from_number: input.fromNumber ?? null,
			sip_trunk_id: input.sipTrunkId ?? null,
			livekit_sip_trunk_id: input.livekitSipTrunkId ?? null,
			direction: input.direction,
			channel: input.channel,
			contact_metadata: input.contactMetadata ?? {},
			recording_enabled: recordingEnabled,
		});
		const metadataJson = serializeDispatchMetadata(dispatchMetadata);
		const agentName = input.agentName ?? AGENT_NAME;

		let participantToken: string | null = null;
		const cfg = getLiveKitConfig();

		await createOutboundRoomWithDispatch({
			roomName,
			agentName,
			metadata: metadataJson,
		});

		if (input.channel === "WEB" && input.mintParticipantToken) {
			const identity = `user-${Math.floor(Math.random() * 10_000)}`;
			participantToken = await createParticipantToken({
				identity,
				name: input.participantName,
				roomName,
			});
		}

		return {
			session,
			roomName,
			serverUrl: cfg.url,
			participantToken,
			dispatchMetadata,
		};
	});

function trialUnavailableReason(trial: {
	enabled: boolean;
	expiresAt: Date | null;
	usageLimit: number;
	usageCount: number;
	hasPublishedVersion: boolean;
}): "disabled" | "expired" | "exhausted" | "unpublished" | null {
	if (!trial.enabled) return "disabled";
	if (trial.expiresAt && trial.expiresAt.getTime() < Date.now()) {
		return "expired";
	}
	if (trial.usageCount >= trial.usageLimit) return "exhausted";
	if (!trial.hasPublishedVersion) return "unpublished";
	return null;
}

function normalizeTrialVariables(raw: unknown): Array<{
	name: string;
	variable_type: "link" | "text" | "number" | "file";
	required: boolean;
}> {
	const allowed = new Set(["link", "text", "number", "file"]);
	if (Array.isArray(raw)) {
		return raw
			.map((item) => {
				const v = item as {
					name?: string;
					variable_type?: string;
					required?: boolean;
				};
				const name = (v.name ?? "").trim();
				const variable_type = allowed.has(v.variable_type ?? "")
					? (v.variable_type as "link" | "text" | "number" | "file")
					: "text";
				return {
					name,
					variable_type,
					required: Boolean(v.required),
				};
			})
			.filter((item) => item.name.length > 0);
	}
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return Object.keys(raw as Record<string, unknown>).map((name) => ({
			name,
			variable_type: "text" as const,
			required: false,
		}));
	}
	return [];
}

function normalizeTrialPhoneNumber(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const digits = trimmed.replace(/[^\d+]/g, "");
	if (digits.startsWith("+")) {
		const rest = digits.slice(1).replace(/\D/g, "");
		if (rest.length < 8 || rest.length > 15) return null;
		return `+${rest}`;
	}
	const onlyDigits = digits.replace(/\D/g, "");
	if (onlyDigits.length === 10) return `+91${onlyDigits}`;
	if (onlyDigits.length === 12 && onlyDigits.startsWith("91")) {
		return `+${onlyDigits}`;
	}
	if (onlyDigits.length >= 8 && onlyDigits.length <= 15) {
		return `+${onlyDigits}`;
	}
	return null;
}

export const getTrialLink = publicProcedure
	.route({
		method: "GET",
		path: "/sessions/trial-links/{token}",
		tags: ["Sessions"],
		summary: "Get public trial link details",
	})
	.input(z.object({ token: z.string().min(1) }))
	.handler(async ({ input }) => {
		const trial = await getAgentTrialByToken(input.token);
		if (!trial?.token) {
			throw new ORPCError("NOT_FOUND", {
				message: "This shared link is invalid",
			});
		}

		const remaining = Math.max(0, trial.usageLimit - trial.usageCount);
		const hasPublishedVersion = Boolean(trial.agent.publishedVersion);
		const unavailableReason = trialUnavailableReason({
			enabled: trial.enabled,
			expiresAt: trial.expiresAt,
			usageLimit: trial.usageLimit,
			usageCount: trial.usageCount,
			hasPublishedVersion,
		});
		const config =
			(trial.agent.publishedVersion?.config as Record<
				string,
				unknown
			> | null) ?? null;
		const avatarConfig =
			config && typeof config.avatar === "object" && config.avatar
				? (config.avatar as { enabled?: boolean })
				: null;

		return {
			trial: {
				id: trial.id,
				label: trial.label,
				token: trial.token,
				enabled: trial.enabled,
				usageLimit: trial.usageLimit,
				usageCount: trial.usageCount,
				remaining,
				expiresAt: trial.expiresAt,
				available: unavailableReason === null,
				unavailableReason,
			},
			agent: {
				id: trial.agent.id,
				name: trial.agent.name,
				avatarEnabled: Boolean(avatarConfig?.enabled),
				hasPublishedVersion,
				variables: normalizeTrialVariables(config?.variables),
			},
		};
	});

export const startTrialSession = publicProcedure
	.route({
		method: "POST",
		path: "/sessions/trial-links/{token}/start",
		tags: ["Sessions"],
		summary: "Start a public trial session",
	})
	.input(
		z.object({
			token: z.string().min(1),
			participantName: z.string().min(1).max(120).default("Guest"),
			contactMetadata: z.record(z.string(), z.unknown()).optional(),
			phoneNumber: z.string().min(1).max(32).optional(),
		}),
	)
	.handler(async ({ input }) => {
		const existing = await getAgentTrialByToken(input.token);
		if (!existing?.token) {
			throw new ORPCError("NOT_FOUND", {
				message: "This shared link is invalid",
			});
		}

		const precheckReason = trialUnavailableReason({
			enabled: existing.enabled,
			expiresAt: existing.expiresAt,
			usageLimit: existing.usageLimit,
			usageCount: existing.usageCount,
			hasPublishedVersion: Boolean(existing.agent.publishedVersion),
		});
		if (precheckReason) {
			const messages = {
				disabled: "This shared link has been disabled",
				expired: "This shared link has expired",
				exhausted: "This shared link has no sessions left",
				unpublished: "This agent is not published yet",
			} as const;
			throw new ORPCError("FORBIDDEN", {
				message: messages[precheckReason],
			});
		}

		const version = existing.agent.publishedVersion;
		if (!version) {
			throw new ORPCError("BAD_REQUEST", {
				message: "This agent is not published yet",
			});
		}

		const normalizedPhone = input.phoneNumber
			? normalizeTrialPhoneNumber(input.phoneNumber)
			: null;
		if (input.phoneNumber && !normalizedPhone) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Enter a valid phone number",
			});
		}
		const isPhone = Boolean(normalizedPhone);

		const trial = await consumeAgentTrialToken(input.token);
		if (!trial || !trial.token) {
			throw new ORPCError("FORBIDDEN", {
				message: "This shared link is not available anymore",
			});
		}

		const agent = existing.agent;
		const configSnapshot =
			(version.config as Record<string, unknown>) ?? {};
		const recordingEnabled = configRecordingEnabled(configSnapshot);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const roomName = isPhone
			? `PHONE_SESSION_${Math.floor(Math.random() * 100_000)}`
			: `SESSION_${timestamp}_${Math.floor(Math.random() * 10_000)}`;

		const session = await createAgentSession({
			organizationId: agent.organizationId,
			agentId: agent.id,
			agentVersionId: version.id,
			livekitRoomName: roomName,
			channel: isPhone ? "PHONE" : "WEB",
			direction: isPhone ? "OUTBOUND" : "WEB",
			toNumber: normalizedPhone ?? undefined,
			configSnapshot,
			recordingEnabled,
			metadata: {
				source: "trial_link",
				trialId: trial.id,
				trialLabel: trial.label,
				channel: isPhone ? "PHONE" : "WEB",
			},
		});

		const dispatchMetadata = await buildDispatchMetadata({
			organization_id: agent.organizationId,
			agent_id: agent.id,
			agent_version_id: version.id,
			session_id: session.id,
			config: configSnapshot,
			source: isPhone ? "phone" : "web",
			phone_number: normalizedPhone ?? undefined,
			direction: isPhone ? "OUTBOUND" : "WEB",
			channel: isPhone ? "PHONE" : "WEB",
			contact_metadata: input.contactMetadata ?? {},
			recording_enabled: recordingEnabled,
		});
		const metadataJson = isPhone
			? JSON.stringify({
					...dispatchMetadata,
					interactionMode: "audio",
					scenarioType: "phone",
					persona: input.participantName,
				})
			: serializeDispatchMetadata(dispatchMetadata);
		await createOutboundRoomWithDispatch({
			roomName,
			agentName: AGENT_NAME,
			metadata: metadataJson,
		});

		if (isPhone) {
			return {
				sessionId: session.id,
				roomName,
				channel: "PHONE" as const,
				serverUrl: null,
				participantToken: null,
				phoneNumber: normalizedPhone,
			};
		}

		const participantToken = await createParticipantToken({
			identity: `user-${Math.floor(Math.random() * 10_000)}`,
			name: input.participantName,
			roomName,
		});

		const cfg = getLiveKitConfig();
		return {
			sessionId: session.id,
			roomName,
			channel: "WEB" as const,
			serverUrl: cfg.url,
			participantToken,
			phoneNumber: null,
		};
	});

async function startEgressForSession(
	session: NonNullable<Awaited<ReturnType<typeof getAgentSessionById>>>,
	audioOnly?: boolean,
) {
	const s3 = getEgressS3Config();
	const filepath = recordingFilepath({
		organizationId: session.organizationId,
		sessionId: session.id,
		roomName: session.livekitRoomName,
	});
	const resolvedAudioOnly =
		audioOnly ?? (session.channel === "SIP" || session.channel === "PHONE");

	const remote = await startRoomCompositeEgress({
		roomName: session.livekitRoomName,
		filepath,
		audioOnly: resolvedAudioOnly,
		s3,
	});

	const job = await createEgressJob({
		organizationId: session.organizationId,
		type: "ROOM_COMPOSITE",
		agentSessionId: session.id,
		agentId: session.agentId,
		campaignSessionId: session.campaignSession?.id,
		livekitEgressId: remote.egressId,
		roomName: session.livekitRoomName,
		status: "ACTIVE",
		destination: s3
			? {
					bucket: s3.bucket,
					region: s3.region,
					filepath,
					endpoint: s3.endpoint ?? null,
				}
			: { filepath },
		fileUrl: s3 ? `s3://${s3.bucket}/${filepath}` : undefined,
		outputUrls: s3 ? [`s3://${s3.bucket}/${filepath}`] : [],
		metadata: { audioOnly: resolvedAudioOnly },
	});

	return { job, remote };
}

export const startSessionEgress = protectedProcedure
	.route({
		method: "POST",
		path: "/sessions/{id}/egress",
		tags: ["Sessions"],
		summary: "Start room-composite egress for a session",
	})
	.input(
		z.object({
			id: z.string(),
			audioOnly: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(session.organizationId, context.user.id);
		return startEgressForSession(session, input.audioOnly);
	});

export const end = protectedProcedure
	.route({
		method: "POST",
		path: "/sessions/{id}/end",
		tags: ["Sessions"],
		summary: "End an active agent session and delete its LiveKit room",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const existing = await getAgentSessionById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);

		if (existing.status === "COMPLETED" || existing.status === "FAILED") {
			throw new ORPCError("BAD_REQUEST", {
				message: `Session is already ${existing.status.toLowerCase()}`,
			});
		}

		async function ensureRoomDeleted(roomName: string) {
			try {
				await deleteRoom(roomName);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				const alreadyGone =
					/not found|does not exist|404/i.test(message) ||
					(error as { status?: number })?.status === 404;
				if (!alreadyGone) {
					logger.error(
						"Failed to delete LiveKit room on session end",
						error,
					);
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Failed to end LiveKit room for session",
					});
				}
			}
		}

		if (existing.status === "CANCELLED") {
			await ensureRoomDeleted(existing.livekitRoomName);
			return { session: existing };
		}

		// Mark cancelled first so room_finished webhook won't overwrite as COMPLETED.
		const session = await updateAgentSessionLifecycle(existing.id, {
			status: "CANCELLED",
			endReason: "CANCELLED",
		});
		if (!session) throw new ORPCError("NOT_FOUND");

		await createSessionEvent({
			organizationId: session.organizationId,
			sessionId: session.id,
			eventType: "session.ended",
			actor: "SYSTEM",
			payload: {
				reason: "CANCELLED",
				endedByUserId: context.user.id,
			},
		});

		await ensureRoomDeleted(session.livekitRoomName);

		return { session };
	});

export const patchLifecycle = workerProcedure
	.route({
		method: "PATCH",
		path: "/internal/sessions/{id}/lifecycle",
		tags: ["Internal"],
		summary: "Update agent session lifecycle (worker)",
	})
	.input(
		z.object({
			id: z.string(),
			status: z.enum([
				"QUEUED",
				"ACTIVE",
				"COMPLETED",
				"FAILED",
				"CANCELLED",
			]),
			livekitJobId: z.string().optional(),
			livekitWorkerId: z.string().optional(),
			livekitRoomSid: z.string().optional(),
			endReason: z
				.enum([
					"COMPLETED",
					"PARTICIPANT_LEFT",
					"ROOM_FINISHED",
					"ERROR",
					"CANCELLED",
					"TIMEOUT",
				])
				.optional(),
			errorCode: z.string().optional(),
			errorMessage: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const { id, ...data } = input;
		const session = await updateAgentSessionLifecycle(id, data);
		if (!session) throw new ORPCError("NOT_FOUND");
		return { session };
	});

export const postEvent = workerProcedure
	.route({
		method: "POST",
		path: "/internal/sessions/{id}/events",
		tags: ["Internal"],
		summary: "Append session event (worker)",
	})
	.input(
		z.object({
			id: z.string(),
			eventType: z.string().min(1),
			actor: z.enum(["AGENT", "USER", "SYSTEM", "WORKER"]).optional(),
			payload: z.record(z.string(), z.unknown()).optional(),
		}),
	)
	.handler(async ({ input }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) throw new ORPCError("NOT_FOUND");
		const event = await createSessionEvent({
			organizationId: session.organizationId,
			sessionId: session.id,
			eventType: input.eventType,
			actor: input.actor,
			payload: input.payload ?? {},
		});
		return { event };
	});

export const postToolCall = workerProcedure
	.route({
		method: "POST",
		path: "/internal/sessions/{id}/tool-calls",
		tags: ["Internal"],
		summary: "Record tool call (worker)",
	})
	.input(
		z.object({
			id: z.string(),
			toolName: z.string().min(1),
			arguments: z.record(z.string(), z.unknown()).optional(),
			result: z
				.union([z.string(), z.record(z.string(), z.unknown())])
				.optional(),
			status: z
				.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"])
				.optional(),
			isError: z.boolean().optional(),
			error: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) throw new ORPCError("NOT_FOUND");
		const result =
			typeof input.result === "string"
				? { text: input.result }
				: (input.result ?? {});
		const toolCall = await createToolCallRecord({
			organizationId: session.organizationId,
			sessionId: session.id,
			toolName: input.toolName,
			arguments: input.arguments ?? {},
			result,
			status: input.status ?? (input.isError ? "FAILED" : "COMPLETED"),
			error:
				input.error ??
				(input.isError ? String(input.result) : undefined),
		});
		return { toolCall };
	});

export const postReport = workerProcedure
	.route({
		method: "POST",
		path: "/internal/sessions/{id}/report",
		tags: ["Internal"],
		summary: "Save session report, transcript, and usage (worker)",
	})
	.input(
		z.object({
			id: z.string(),
			report: z.record(z.string(), z.unknown()).default({}),
			usage: z
				.union([
					z.record(z.string(), z.unknown()),
					z.array(z.record(z.string(), z.unknown())),
				])
				.optional(),
			metrics: z.array(z.record(z.string(), z.unknown())).optional(),
			isFinal: z.boolean().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const existing = await getAgentSessionById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");

		const usageNormalized = Array.isArray(input.usage)
			? { model_usage: input.usage }
			: input.usage;

		const session = await saveAgentSessionReport(input.id, {
			report: input.report,
			usage: usageNormalized,
			mergeReport: true,
		});
		if (!session) throw new ORPCError("NOT_FOUND");

		// Metrics-only stubs should not wipe transcript extraction; still
		// append metric events via persistSessionArtifacts.
		const reportForArtifacts = isMetricsOnlyReport(input.report)
			? (session.livekitSessionReport ?? input.report)
			: input.report;

		const artifacts = await persistSessionArtifacts({
			organizationId: session.organizationId,
			sessionId: session.id,
			agentId: session.agentId,
			report: reportForArtifacts,
			usage: usageNormalized,
			metrics: input.metrics,
			isFinal: input.isFinal ?? true,
		});

		return {
			session: await getAgentSessionById(session.id),
			artifacts,
		};
	});

export const startEgressInternal = workerProcedure
	.route({
		method: "POST",
		path: "/internal/sessions/{id}/egress",
		tags: ["Internal"],
		summary: "Start egress for session (worker)",
	})
	.input(
		z.object({
			id: z.string(),
			audioOnly: z.boolean().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) throw new ORPCError("NOT_FOUND");
		return startEgressForSession(session, input.audioOnly);
	});

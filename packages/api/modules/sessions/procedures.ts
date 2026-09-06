import { ORPCError } from "@orpc/client";
import {
	createAgentSession,
	createEgressJob,
	createSessionEvent,
	createToolCallRecord,
	getAgentById,
	getAgentSessionById,
	linkCampaignSessionToAgentSession,
	listAgentSessions,
	saveAgentSessionReport,
	updateAgentSessionLifecycle,
} from "@repo/database";
import {
	createOutboundRoomWithDispatch,
	createParticipantToken,
	createRoom,
	getEgressS3Config,
	getLiveKitConfig,
	recordingFilepath,
	startRoomCompositeEgress,
} from "@repo/livekit";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	buildDispatchMetadata,
	serializeDispatchMetadata,
} from "./lib/dispatch-metadata";
import { persistSessionArtifacts } from "./lib/normalize-report";
import { workerProcedure } from "./lib/worker-procedure";

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	return Boolean((config as { recordingEnabled?: boolean }).recordingEnabled);
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
		return { session };
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

		const dispatchMetadata = buildDispatchMetadata({
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

		if (input.channel === "WEB" && input.mintParticipantToken) {
			const roomConfig = new RoomConfiguration({
				agents: [
					new RoomAgentDispatch({
						agentName,
						metadata: metadataJson,
					}),
				],
				metadata: metadataJson,
			});

			await createRoom({
				name: roomName,
				metadata: metadataJson,
			});

			const identity = `user_${Math.floor(Math.random() * 10_000)}`;
			participantToken = await createParticipantToken({
				identity,
				name: input.participantName,
				roomName,
				roomConfig,
			});

			return {
				session,
				roomName,
				serverUrl: cfg.url,
				participantToken,
				dispatchMetadata,
			};
		}

		await createOutboundRoomWithDispatch({
			roomName,
			agentName,
			metadata: metadataJson,
		});

		return {
			session,
			roomName,
			serverUrl: cfg.url,
			participantToken,
			dispatchMetadata,
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
			usage: z.record(z.string(), z.unknown()).optional(),
			metrics: z.array(z.record(z.string(), z.unknown())).optional(),
			isFinal: z.boolean().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const existing = await getAgentSessionById(input.id);
		if (!existing) throw new ORPCError("NOT_FOUND");

		const session = await saveAgentSessionReport(input.id, {
			report: input.report,
			usage: input.usage,
		});
		if (!session) throw new ORPCError("NOT_FOUND");

		const artifacts = await persistSessionArtifacts({
			organizationId: session.organizationId,
			sessionId: session.id,
			agentId: session.agentId,
			report: input.report,
			usage: input.usage,
			isFinal: input.isFinal ?? true,
		});

		if (input.metrics?.length) {
			for (const metric of input.metrics) {
				await createSessionEvent({
					organizationId: session.organizationId,
					sessionId: session.id,
					eventType: `agent.metric.${String(metric.type ?? metric.name ?? "metric")}`,
					actor: "WORKER",
					payload: metric,
				});
			}
		}

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

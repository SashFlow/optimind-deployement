import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import {
	consumeAgentTrialToken,
	createAgentSession,
	createEgressJob,
	createSessionEvent,
	createToolCallRecord,
	getAgentByEmbedToken,
	getAgentById,
	getAgentSessionById,
	getAgentTrialByToken,
	linkCampaignSessionToAgentSession,
	listAgentSessions,
	saveAgentSessionReport,
	syncCampaignSessionFromAgentSession,
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
	verifyParticipantToken,
} from "@repo/livekit";
import { logger } from "@repo/logs";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";
import {
	buildDispatchMetadata,
	resolveAvatarProviderId,
	serializeDispatchMetadata,
} from "./lib/dispatch-metadata";
import {
	inferEgressContentType,
	resolveEgressPlayableUrl,
} from "./lib/egress-media-url";
import { resolveSessionEndUser, toDispatchEndUser } from "./lib/end-user";
import {
	MAX_END_USER_FILE_BYTES,
	uploadEndUserFile,
	withSignedFileUrls,
} from "./lib/end-user-files";
import { generateEndUserMemoriesSafe } from "./lib/memories";
import {
	isMetricsOnlyReport,
	persistSessionArtifacts,
} from "./lib/normalize-report";
import {
	finalizeSessionEgressJobs,
	reconcileOpenEgressJobs,
} from "./lib/reconcile-egress";
import { workerProcedure } from "./lib/worker-procedure";
import type {
	GetEmbedAgentOutput,
	GetTrialLinkOutput,
	PublicAgentPreview,
	StartPublicSessionOutput,
} from "./public-types";

const AGENT_NAME = process.env.AGENT_NAME || "demo-agent";

/**
 * SpatialReal app id, handed out only with a started web session so it stays
 * out of the client bundle (the browser SDK still needs it at runtime).
 */
function getSpatialRealAppId(): string | null {
	return process.env.SPATIALREAL_APP_ID?.trim() || null;
}

function getSpatialRealApiKey(): string | null {
	return process.env.SPATIALREAL_API_KEY?.trim() || null;
}

async function mintSpatialRealSessionToken(): Promise<string | null> {
	const apiKey = getSpatialRealApiKey();
	if (!apiKey) {
		return null;
	}

	try {
		const res = await fetch(
			"https://api.spatialreal.com/v1/auth/session-token",
			{
				method: "POST",
				headers: {
					"X-API-KEY": apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					expire_at: Math.floor(Date.now() / 1000) + 3600,
				}),
			},
		);

		if (!res.ok) {
			logger.error("SpatialReal session-token mint failed", {
				status: res.status,
				body: await res.text().catch(() => null),
			});
			return null;
		}

		const data = (await res.json()) as { session_token?: unknown };
		return typeof data.session_token === "string"
			? data.session_token
			: null;
	} catch (error) {
		logger.error("SpatialReal session-token mint error", { error });
		return null;
	}
}

async function mintSpatialRealClientCredentials(opts: {
	sessionId: string;
	roomName: string;
}): Promise<{
	spatialRealAppId: string | null;
	spatialRealSessionToken: string | null;
	spatialRealRendererToken: string | null;
}> {
	const spatialRealAppId = getSpatialRealAppId();
	if (!spatialRealAppId) {
		return {
			spatialRealAppId: null,
			spatialRealSessionToken: null,
			spatialRealRendererToken: null,
		};
	}

	const spatialRealSessionToken = await mintSpatialRealSessionToken();

	let spatialRealRendererToken: string | null = null;
	try {
		spatialRealRendererToken = await createParticipantToken({
			identity: `spatialreal-renderer-${opts.sessionId}`,
			name: "SpatialReal Renderer",
			roomName: opts.roomName,
		});
	} catch (error) {
		logger.error("SpatialReal renderer LiveKit token mint failed", {
			error,
			sessionId: opts.sessionId,
			roomName: opts.roomName,
		});
	}

	return {
		spatialRealAppId,
		spatialRealSessionToken,
		spatialRealRendererToken,
	};
}

function configRecordingEnabled(config: unknown): boolean {
	if (!config || typeof config !== "object") {
		return false;
	}
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
			endUserId: z.string().optional(),
			/** Matches end-user name/email/phone/identity, session id, room, numbers. */
			q: z.string().max(200).optional(),
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
		const existing = await getAgentSessionById(input.id);
		if (!existing) {
			throw new ORPCError("NOT_FOUND");
		}
		await requireOrgMembership(existing.organizationId, context.user.id);

		await reconcileOpenEgressJobs(existing.egressJobs);
		const session = (await getAgentSessionById(input.id)) ?? existing;

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
				files: await withSignedFileUrls(session.files),
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

		// Campaign / reschedule calls belong to the contact being dialled;
		// everything else to the logged-in user starting the session.
		const contactPhone =
			input.source === "campaign" || input.source === "reschedule"
				? input.phoneNumber
				: undefined;
		const endUser = await resolveSessionEndUser(
			{ organizationId: input.organizationId, agentId: agent.id },
			contactPhone
				? {
						kind: "phone",
						phone: contactPhone,
						contactMetadata: input.contactMetadata,
					}
				: { kind: "user", user: context.user },
		);

		const session = await createAgentSession({
			organizationId: input.organizationId,
			agentId: agent.id,
			endUserId: endUser.id,
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
			end_user: toDispatchEndUser(endUser),
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

		const spatialReal =
			input.channel === "WEB"
				? await mintSpatialRealClientCredentials({
						sessionId: session.id,
						roomName,
					})
				: {
						spatialRealAppId: null,
						spatialRealSessionToken: null,
						spatialRealRendererToken: null,
					};

		return {
			session,
			roomName,
			serverUrl: cfg.url,
			participantToken,
			dispatchMetadata,
			...spatialReal,
		};
	});

function trialUnavailableReason(trial: {
	enabled: boolean;
	expiresAt: Date | null;
	usageLimit: number;
	usageCount: number;
	hasPublishedVersion: boolean;
}): "disabled" | "expired" | "exhausted" | "unpublished" | null {
	if (!trial.enabled) {
		return "disabled";
	}
	if (trial.expiresAt && trial.expiresAt.getTime() < Date.now()) {
		return "expired";
	}
	if (trial.usageCount >= trial.usageLimit) {
		return "exhausted";
	}
	if (!trial.hasPublishedVersion) {
		return "unpublished";
	}
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

const DEFAULT_TRIAL_SESSION_MODALITIES = {
	call_type: "web" as const,
	audio_track: "mandatory" as const,
	video_track: "optional" as const,
	chat: "optional" as const,
	memory: true,
	proctoring: {
		enabled: false,
		proactive_response: false,
		id_verification: false,
	},
};

function normalizeTrialSessionModalities(
	raw: unknown,
): PublicAgentPreview["sessionModalities"] {
	const source =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};
	const callType: PublicAgentPreview["sessionModalities"]["call_type"] =
		source.call_type === "phone" ||
		source.call_type === "web" ||
		source.call_type === "both"
			? source.call_type
			: DEFAULT_TRIAL_SESSION_MODALITIES.call_type;
	const asTrack = (
		value: unknown,
		fallback: "mandatory" | "optional",
	): "mandatory" | "optional" =>
		value === "mandatory" || value === "optional" ? value : fallback;
	const proctoringRaw =
		source.proctoring &&
		typeof source.proctoring === "object" &&
		!Array.isArray(source.proctoring)
			? (source.proctoring as Record<string, unknown>)
			: {};

	return {
		call_type: callType,
		audio_track: asTrack(
			source.audio_track,
			DEFAULT_TRIAL_SESSION_MODALITIES.audio_track,
		),
		video_track: asTrack(
			source.video_track,
			DEFAULT_TRIAL_SESSION_MODALITIES.video_track,
		),
		chat: asTrack(source.chat, DEFAULT_TRIAL_SESSION_MODALITIES.chat),
		memory:
			typeof source.memory === "boolean"
				? source.memory
				: DEFAULT_TRIAL_SESSION_MODALITIES.memory,
		proctoring: {
			enabled: Boolean(
				proctoringRaw.enabled ??
					DEFAULT_TRIAL_SESSION_MODALITIES.proctoring.enabled,
			),
			proactive_response: Boolean(
				proctoringRaw.proactive_response ??
					DEFAULT_TRIAL_SESSION_MODALITIES.proctoring
						.proactive_response,
			),
			id_verification: Boolean(
				proctoringRaw.id_verification ??
					DEFAULT_TRIAL_SESSION_MODALITIES.proctoring.id_verification,
			),
		},
	};
}

function normalizeTrialMaxDurationSeconds(raw: unknown): number | null {
	if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
		return null;
	}
	return Math.floor(raw);
}

function normalizeTrialPhoneNumber(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	const digits = trimmed.replace(/[^\d+]/g, "");
	if (digits.startsWith("+")) {
		const rest = digits.slice(1).replace(/\D/g, "");
		if (rest.length < 8 || rest.length > 15) {
			return null;
		}
		return `+${rest}`;
	}
	const onlyDigits = digits.replace(/\D/g, "");
	if (onlyDigits.length === 10) {
		return `+91${onlyDigits}`;
	}
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
	.output(type<GetTrialLinkOutput>())
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
				? (config.avatar as {
						enabled?: boolean;
						provider_id?: string | null;
						external_avatar_id?: string | null;
					})
				: null;
		const callEnding =
			config &&
			typeof config.call_ending === "object" &&
			config.call_ending
				? (config.call_ending as Record<string, unknown>)
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
				// The share page needs these to pick the avatar renderer:
				// anam publishes a video track, spatialreal renders a canvas.
				avatarProvider: resolveAvatarProviderId(
					avatarConfig?.external_avatar_id,
					avatarConfig?.provider_id,
				),
				avatarId: avatarConfig?.external_avatar_id ?? null,
				hasPublishedVersion,
				variables: normalizeTrialVariables(config?.variables),
				sessionModalities: normalizeTrialSessionModalities(
					config?.session_modalities,
				),
				maxDurationSeconds: normalizeTrialMaxDurationSeconds(
					callEnding?.max_duration_seconds,
				),
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
			/** When set, the agent calls this number instead of a web session. */
			phoneNumber: z.string().min(1).max(32).optional(),
			/** Visitor details for the trial end user. */
			name: z.string().trim().max(120).optional(),
			email: z.string().trim().email().max(254).optional(),
			contactPhone: z.string().trim().max(32).optional(),
		}),
	)
	.output(type<StartPublicSessionOutput>())
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

		const contactPhone = input.contactPhone
			? (normalizeTrialPhoneNumber(input.contactPhone) ??
				input.contactPhone)
			: null;
		const endUser = await resolveSessionEndUser(
			{ organizationId: agent.organizationId, agentId: agent.id },
			{
				kind: "trial",
				trial: { id: trial.id, label: trial.label },
				name:
					input.name ||
					(input.participantName !== "Guest"
						? input.participantName
						: null),
				email: input.email,
				phone: normalizedPhone ?? contactPhone,
				variables: input.contactMetadata,
			},
		);

		const session = await createAgentSession({
			organizationId: agent.organizationId,
			agentId: agent.id,
			endUserId: endUser.id,
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
			end_user: toDispatchEndUser(endUser),
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
				spatialRealAppId: null,
				spatialRealSessionToken: null,
				spatialRealRendererToken: null,
			};
		}

		const participantToken = await createParticipantToken({
			identity: `user-${Math.floor(Math.random() * 10_000)}`,
			name: input.participantName,
			roomName,
		});

		const cfg = getLiveKitConfig();
		const spatialReal = await mintSpatialRealClientCredentials({
			sessionId: session.id,
			roomName,
		});
		return {
			sessionId: session.id,
			roomName,
			channel: "WEB" as const,
			serverUrl: cfg.url,
			participantToken,
			phoneNumber: null,
			...spatialReal,
		};
	});

export const getEmbedAgent = publicProcedure
	.route({
		method: "GET",
		path: "/sessions/embed/{token}",
		tags: ["Sessions"],
		summary: "Get public embed agent details",
	})
	.input(z.object({ token: z.string().min(1) }))
	.output(type<GetEmbedAgentOutput>())
	.handler(async ({ input }) => {
		const agent = await getAgentByEmbedToken(input.token);
		if (!agent?.token) {
			throw new ORPCError("NOT_FOUND", {
				message: "This embed link is invalid",
			});
		}

		const hasPublishedVersion = Boolean(agent.publishedVersion);
		const unavailableReason = !hasPublishedVersion
			? ("unpublished" as const)
			: null;
		const config =
			(agent.publishedVersion?.config as Record<
				string,
				unknown
			> | null) ?? null;
		const avatarConfig =
			config && typeof config.avatar === "object" && config.avatar
				? (config.avatar as {
						enabled?: boolean;
						provider_id?: string | null;
						external_avatar_id?: string | null;
					})
				: null;
		const callEnding =
			config &&
			typeof config.call_ending === "object" &&
			config.call_ending
				? (config.call_ending as Record<string, unknown>)
				: null;

		return {
			embed: {
				token: agent.token,
				available: unavailableReason === null,
				unavailableReason,
			},
			agent: {
				id: agent.id,
				name: agent.name,
				avatarEnabled: Boolean(avatarConfig?.enabled),
				avatarProvider: resolveAvatarProviderId(
					avatarConfig?.external_avatar_id,
					avatarConfig?.provider_id,
				),
				avatarId: avatarConfig?.external_avatar_id ?? null,
				hasPublishedVersion,
				variables: normalizeTrialVariables(config?.variables),
				sessionModalities: normalizeTrialSessionModalities(
					config?.session_modalities,
				),
				maxDurationSeconds: normalizeTrialMaxDurationSeconds(
					callEnding?.max_duration_seconds,
				),
			},
		};
	});

export const startEmbedSession = publicProcedure
	.route({
		method: "POST",
		path: "/sessions/embed/{token}/start",
		tags: ["Sessions"],
		summary: "Start a public embed session",
	})
	.input(
		z.object({
			token: z.string().min(1),
			participantName: z.string().min(1).max(120).default("Guest"),
			contactMetadata: z.record(z.string(), z.unknown()).optional(),
			/** External end-user id for upsert (query ?id=). */
			externalId: z.string().trim().min(1).max(200).optional(),
			name: z.string().trim().max(120).optional(),
		}),
	)
	.output(type<StartPublicSessionOutput>())
	.handler(async ({ input }) => {
		const agent = await getAgentByEmbedToken(input.token);
		if (!agent?.token) {
			throw new ORPCError("NOT_FOUND", {
				message: "This embed link is invalid",
			});
		}

		const version = agent.publishedVersion;
		if (!version) {
			throw new ORPCError("FORBIDDEN", {
				message: "This agent is not published yet",
			});
		}

		const configSnapshot =
			(version.config as Record<string, unknown>) ?? {};
		const recordingEnabled = configRecordingEnabled(configSnapshot);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const roomName = `SESSION_${timestamp}_${Math.floor(Math.random() * 10_000)}`;

		const endUser = await resolveSessionEndUser(
			{ organizationId: agent.organizationId, agentId: agent.id },
			input.externalId
				? {
						kind: "external",
						externalId: input.externalId,
						name:
							input.name ||
							(input.participantName !== "Guest"
								? input.participantName
								: null),
						metadata: input.contactMetadata,
					}
				: {
						kind: "anonymous",
						name:
							input.name ||
							(input.participantName !== "Guest"
								? input.participantName
								: null),
					},
		);

		const session = await createAgentSession({
			organizationId: agent.organizationId,
			agentId: agent.id,
			endUserId: endUser.id,
			livekitRoomName: roomName,
			channel: "WEB",
			direction: "WEB",
			configSnapshot,
			recordingEnabled,
			metadata: {
				source: "embed",
				externalId: input.externalId ?? null,
				channel: "WEB",
			},
		});

		const dispatchMetadata = await buildDispatchMetadata({
			organization_id: agent.organizationId,
			agent_id: agent.id,
			agent_version_id: version.id,
			session_id: session.id,
			config: configSnapshot,
			source: "web",
			direction: "WEB",
			channel: "WEB",
			contact_metadata: input.contactMetadata ?? {},
			end_user: toDispatchEndUser(endUser),
			recording_enabled: recordingEnabled,
		});
		await createOutboundRoomWithDispatch({
			roomName,
			agentName: AGENT_NAME,
			metadata: serializeDispatchMetadata(dispatchMetadata),
		});

		const participantToken = await createParticipantToken({
			identity: `user-${Math.floor(Math.random() * 10_000)}`,
			name: input.participantName,
			roomName,
		});

		const cfg = getLiveKitConfig();
		const spatialReal = await mintSpatialRealClientCredentials({
			sessionId: session.id,
			roomName,
		});
		return {
			sessionId: session.id,
			roomName,
			channel: "WEB" as const,
			serverUrl: cfg.url,
			participantToken,
			phoneNumber: null,
			...spatialReal,
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
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
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
		if (!existing) {
			throw new ORPCError("NOT_FOUND");
		}
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
			await finalizeSessionEgressJobs(existing.egressJobs);
			await ensureRoomDeleted(existing.livekitRoomName);
			return { session: existing };
		}

		await finalizeSessionEgressJobs(existing.egressJobs);

		// Mark cancelled first so room_finished webhook won't overwrite as COMPLETED.
		const session = await updateAgentSessionLifecycle(existing.id, {
			status: "CANCELLED",
			endReason: "CANCELLED",
		});
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}

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
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}

		if (
			data.status === "COMPLETED" ||
			data.status === "FAILED" ||
			data.status === "CANCELLED"
		) {
			await finalizeSessionEgressJobs(session.egressJobs);
			try {
				await syncCampaignSessionFromAgentSession(session.id);
			} catch {
				// Non-fatal: campaign sync is best-effort
			}
			try {
				const { resumeAgentSessionWait } = await import(
					"../workflows/lib/runner"
				);
				await resumeAgentSessionWait(session.id);
			} catch {
				// Non-fatal: workflow resume is best-effort
			}
			if (data.status === "COMPLETED") {
				await generateEndUserMemoriesSafe(session.id);
			}
		}

		return {
			session: (await getAgentSessionById(session.id)) ?? session,
		};
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
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
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
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
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
			collectedData: z
				.array(
					z.object({
						key: z.string().min(1),
						value: z.unknown(),
						label: z.string().optional(),
						fieldType: z.string().optional(),
						required: z.boolean().optional(),
					}),
				)
				.optional(),
			isFinal: z.boolean().optional(),
		}),
	)
	.handler(async ({ input }) => {
		const existing = await getAgentSessionById(input.id);
		if (!existing) {
			throw new ORPCError("NOT_FOUND");
		}

		const usageNormalized = Array.isArray(input.usage)
			? { model_usage: input.usage }
			: input.usage;

		const session = await saveAgentSessionReport(input.id, {
			report: input.report,
			usage: usageNormalized,
			mergeReport: true,
		});
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}

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

		if (input.collectedData && input.collectedData.length > 0) {
			const prevMeta =
				session.metadata &&
				typeof session.metadata === "object" &&
				!Array.isArray(session.metadata)
					? (session.metadata as Record<string, unknown>)
					: {};
			const { db } = await import("@repo/database");
			await db.agentSession.update({
				where: { id: session.id },
				data: {
					metadata: {
						...prevMeta,
						collectedData: Object.fromEntries(
							input.collectedData.map((f) => [f.key, f.value]),
						),
					} as object,
				},
			});
		}

		try {
			await syncCampaignSessionFromAgentSession(session.id);
		} catch {
			// Non-fatal
		}

		// Report can land after lifecycle COMPLETED; memories need the transcript.
		if (input.isFinal !== false && session.status === "COMPLETED") {
			await generateEndUserMemoriesSafe(session.id);
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
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
		return startEgressForSession(session, input.audioOnly);
	});

export const uploadFileInternal = workerProcedure
	.route({
		method: "POST",
		path: "/internal/sessions/{id}/files",
		tags: ["Internal"],
		summary: "Upload a file for the session's end user (worker, multipart)",
	})
	.input(
		z.object({
			id: z.string(),
			file: z.file(),
			name: z.string().max(200).optional(),
		}),
	)
	.handler(async ({ input }) => {
		const session = await getAgentSessionById(input.id);
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
		if (!session.endUserId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Session has no end user",
			});
		}
		if (input.file.size > MAX_END_USER_FILE_BYTES) {
			throw new ORPCError("BAD_REQUEST", {
				message: "File is larger than 25 MB",
			});
		}
		const file = await uploadEndUserFile({
			session: {
				id: session.id,
				organizationId: session.organizationId,
				endUserId: session.endUserId,
			},
			file: input.file,
			name: input.name,
		});
		return { file };
	});

const MAX_PARTICIPANT_FILE_BYTES = 5 * 1024 * 1024;

/** Extract a LiveKit participant JWT from Authorization or an explicit input field. */
function readParticipantToken(
	headers: Headers,
	explicit?: string | null,
): string | null {
	const fromInput = explicit?.trim();
	if (fromInput) {
		return fromInput;
	}
	const auth =
		headers.get("authorization") ?? headers.get("Authorization") ?? "";
	const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
	return match?.[1]?.trim() || null;
}

export const uploadParticipantFile = publicProcedure
	.route({
		method: "POST",
		path: "/sessions/{id}/participant-files",
		tags: ["Sessions"],
		summary:
			"Upload a file for the session's end user (participant JWT auth)",
	})
	.input(
		z.object({
			id: z.string(),
			file: z.file(),
			name: z.string().max(200).optional(),
			/** Optional when Authorization: Bearer <livekit-jwt> is set. */
			participantToken: z.string().min(1).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const token = readParticipantToken(
			context.headers,
			input.participantToken,
		);
		if (!token) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Participant token required",
			});
		}

		let claims: Awaited<ReturnType<typeof verifyParticipantToken>>;
		try {
			claims = await verifyParticipantToken(token);
		} catch {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Invalid participant token",
			});
		}

		const session = await getAgentSessionById(input.id);
		if (!session) {
			throw new ORPCError("NOT_FOUND");
		}
		if (session.livekitRoomName !== claims.roomName) {
			throw new ORPCError("FORBIDDEN", {
				message: "Token does not match this session",
			});
		}
		if (session.status !== "QUEUED" && session.status !== "ACTIVE") {
			throw new ORPCError("BAD_REQUEST", {
				message: "Session is no longer accepting uploads",
			});
		}
		if (!session.endUserId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Session has no end user",
			});
		}
		if (input.file.size > MAX_PARTICIPANT_FILE_BYTES) {
			throw new ORPCError("BAD_REQUEST", {
				message: "File is larger than 5 MB",
			});
		}

		const file = await uploadEndUserFile({
			session: {
				id: session.id,
				organizationId: session.organizationId,
				endUserId: session.endUserId,
			},
			file: input.file,
			name: input.name,
		});
		return { file };
	});

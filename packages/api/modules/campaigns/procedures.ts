import { ORPCError } from "@orpc/client";
import {
	attachKnowledgeBaseToCampaign,
	createCampaign,
	createCampaignAccessLink,
	createCampaignContact,
	createCampaignSession,
	enqueueCampaignContacts,
	getCampaignById,
	getCampaignContactById,
	getRecallContext,
	listCampaignContacts,
	listCampaigns,
	listCampaignSessions,
	listQueuedContacts,
	pauseCampaignContact,
	rescheduleCampaignContact,
	updateCampaign,
	updateCampaignSession,
	updateContactMemory,
} from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

async function requireCampaign(id: string, userId: string) {
	const campaign = await getCampaignById(id);
	if (!campaign) throw new ORPCError("NOT_FOUND");
	await requireOrgMembership(campaign.organizationId, userId);
	return campaign;
}

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns",
		tags: ["Campaigns"],
		summary: "List campaigns",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		return { campaigns: await listCampaigns(input.organizationId) };
	});

export const get = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns/{id}",
		tags: ["Campaigns"],
		summary: "Get campaign",
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const campaign = await requireCampaign(input.id, context.user.id);
		return { campaign };
	});

export const create = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns",
		tags: ["Campaigns"],
		summary: "Create campaign",
	})
	.input(
		z.object({
			organizationId: z.string(),
			agentId: z.string(),
			name: z.string().min(1),
			description: z.string().optional(),
			mode: z.enum(["OUTBOUND_LIST", "INBOUND_OPEN", "WEB_LINK"]),
			channel: z.enum(["VOICE", "WEB"]),
			priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
			contextSchema: z.unknown().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);
		const campaign = await createCampaign({
			organizationId: input.organizationId,
			agentId: input.agentId,
			name: input.name,
			description: input.description,
			mode: input.mode,
			channel: input.channel,
			priority: input.priority,
			contextSchema: input.contextSchema as object | undefined,
		});
		return { campaign };
	});

export const update = protectedProcedure
	.route({
		method: "PATCH",
		path: "/campaigns/{id}",
		tags: ["Campaigns"],
		summary: "Update campaign",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().optional(),
			description: z.string().nullable().optional(),
			status: z
				.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"])
				.optional(),
			priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
			startAt: z.coerce.date().nullable().optional(),
			endAt: z.coerce.date().nullable().optional(),
			timezone: z.string().nullable().optional(),
			callingWindowStartHour: z
				.number()
				.int()
				.min(0)
				.max(23)
				.nullable()
				.optional(),
			callingWindowEndHour: z
				.number()
				.int()
				.min(0)
				.max(23)
				.nullable()
				.optional(),
			maxConcurrentSessions: z.number().int().positive().optional(),
			maxAttemptsPerContact: z.number().int().positive().optional(),
			retryDelayMinutes: z.number().int().nonnegative().optional(),
			publicToken: z.string().nullable().optional(),
			embedEnabled: z.boolean().optional(),
			inboundAddress: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		const { id, ...data } = input;
		return { campaign: await updateCampaign(id, data) };
	});

export const listContacts = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns/{id}/contacts",
		tags: ["Campaigns"],
		summary: "List contacts",
	})
	.input(
		z.object({
			id: z.string(),
			status: z
				.enum([
					"PENDING",
					"QUEUED",
					"IN_PROGRESS",
					"COMPLETED",
					"FAILED",
					"SKIPPED",
					"DO_NOT_CONTACT",
					"PAUSED",
					"RESCHEDULED",
					"CANCELLED",
				])
				.optional(),
			limit: z.number().int().positive().max(200).optional(),
			offset: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		const contacts = await listCampaignContacts(input.id, {
			status: input.status,
			limit: input.limit,
			offset: input.offset,
		});
		return { contacts };
	});

export const createContact = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/{id}/contacts",
		tags: ["Campaigns"],
		summary: "Create contact",
	})
	.input(
		z.object({
			id: z.string(),
			displayName: z.string().optional(),
			phoneE164: z.string().optional(),
			email: z.string().email().optional(),
			timezone: z.string().optional(),
			locale: z.string().optional(),
			externalId: z.string().optional(),
			context: z.record(z.string(), z.unknown()).optional(),
			consentGiven: z.boolean().optional(),
			consentSource: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const campaign = await requireCampaign(input.id, context.user.id);
		const contact = await createCampaignContact({
			organizationId: campaign.organizationId,
			campaignId: campaign.id,
			displayName: input.displayName,
			phoneE164: input.phoneE164,
			email: input.email,
			timezone: input.timezone,
			locale: input.locale,
			externalId: input.externalId,
			context: input.context as object | undefined,
			consentGiven: input.consentGiven,
			consentSource: input.consentSource,
		});
		return { contact };
	});

export const enqueueContacts = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/{id}/enqueue",
		tags: ["Campaigns"],
		summary: "Enqueue contacts",
	})
	.input(
		z.object({
			id: z.string(),
			contactIds: z.array(z.string()).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		const result = await enqueueCampaignContacts(
			input.id,
			input.contactIds,
		);
		return { result };
	});

export const pauseContact = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/contacts/{contactId}/pause",
		tags: ["Campaigns"],
		summary: "Pause contact",
	})
	.input(z.object({ contactId: z.string() }))
	.handler(async ({ input, context }) => {
		const existing = await getCampaignContactById(input.contactId);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		return { contact: await pauseCampaignContact(input.contactId) };
	});

export const rescheduleContact = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/contacts/{contactId}/reschedule",
		tags: ["Campaigns"],
		summary: "Reschedule contact",
	})
	.input(
		z.object({
			contactId: z.string(),
			nextAttemptAt: z.coerce.date(),
		}),
	)
	.handler(async ({ input, context }) => {
		const existing = await getCampaignContactById(input.contactId);
		if (!existing) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(existing.organizationId, context.user.id);
		const contact = await rescheduleCampaignContact(
			input.contactId,
			input.nextAttemptAt,
		);
		return { contact };
	});

export const recallContext = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns/contacts/{contactId}/recall",
		tags: ["Campaigns"],
		summary: "Get recall context",
	})
	.input(
		z.object({
			contactId: z.string(),
			limit: z.number().int().positive().max(20).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const data = await getRecallContext(input.contactId, input.limit);
		if (!data) throw new ORPCError("NOT_FOUND");
		await requireOrgMembership(
			data.contact.organizationId,
			context.user.id,
		);
		return data;
	});

export const queue = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns/{id}/queue",
		tags: ["Campaigns"],
		summary: "List queued contacts",
	})
	.input(
		z.object({
			id: z.string(),
			limit: z.number().int().positive().max(100).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		return { contacts: await listQueuedContacts(input.id, input.limit) };
	});

export const createSession = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/{id}/sessions",
		tags: ["Campaigns"],
		summary: "Create session",
	})
	.input(
		z.object({
			id: z.string(),
			contactId: z.string().optional(),
			accessLinkId: z.string().optional(),
			channel: z.enum(["VOICE", "WEB"]),
			direction: z.enum(["INBOUND", "OUTBOUND", "WEB"]).optional(),
			contextSnapshot: z.record(z.string(), z.unknown()).optional(),
			parentSessionId: z.string().optional(),
			livekitRoomName: z.string().optional(),
			livekitRoomSid: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const campaign = await requireCampaign(input.id, context.user.id);
		const session = await createCampaignSession({
			organizationId: campaign.organizationId,
			campaignId: campaign.id,
			contactId: input.contactId,
			accessLinkId: input.accessLinkId,
			channel: input.channel,
			direction: input.direction,
			contextSnapshot: input.contextSnapshot as object | undefined,
			parentSessionId: input.parentSessionId,
			livekitRoomName: input.livekitRoomName,
			livekitRoomSid: input.livekitRoomSid,
		});
		return { session };
	});

export const updateSession = protectedProcedure
	.route({
		method: "PATCH",
		path: "/campaigns/sessions/{sessionId}",
		tags: ["Campaigns"],
		summary: "Update session",
	})
	.input(
		z.object({
			sessionId: z.string(),
			status: z
				.enum([
					"QUEUED",
					"STARTED",
					"IN_PROGRESS",
					"COMPLETED",
					"FAILED",
					"ABANDONED",
					"PAUSED",
					"RESCHEDULED",
				])
				.optional(),
			summary: z.string().optional(),
			outcome: z.string().optional(),
			transcript: z.unknown().optional(),
			messages: z.unknown().optional(),
			recordingUrl: z.string().optional(),
			durationSeconds: z.number().int().optional(),
			endedAt: z.coerce.date().optional(),
			egressId: z.string().optional(),
			egressStatus: z.string().optional(),
			memorySummary: z.string().optional(),
			contactId: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const {
			sessionId,
			memorySummary,
			contactId,
			transcript,
			messages,
			...rest
		} = input;
		const session = await updateCampaignSession(sessionId, {
			...rest,
			transcript: transcript as object | undefined,
			messages: messages as object | undefined,
		});
		await requireOrgMembership(session.organizationId, context.user.id);
		if (memorySummary && (contactId || session.contactId)) {
			await updateContactMemory(
				contactId ?? session.contactId!,
				memorySummary,
			);
		}
		return { session };
	});

export const listSessions = protectedProcedure
	.route({
		method: "GET",
		path: "/campaigns/{id}/sessions",
		tags: ["Campaigns"],
		summary: "List sessions",
	})
	.input(
		z.object({
			id: z.string(),
			contactId: z.string().optional(),
			limit: z.number().int().optional(),
			offset: z.number().int().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		const sessions = await listCampaignSessions(input.id, {
			contactId: input.contactId,
			limit: input.limit,
			offset: input.offset,
		});
		return { sessions };
	});

export const createAccessLink = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/{id}/access-links",
		tags: ["Campaigns"],
		summary: "Create access link",
	})
	.input(
		z.object({
			id: z.string(),
			kind: z.enum(["OPEN", "PERSONALIZED"]),
			contactId: z.string().optional(),
			label: z.string().optional(),
			contextOverrides: z.record(z.string(), z.unknown()).optional(),
			expiresAt: z.coerce.date().optional(),
			maxUses: z.number().int().positive().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const campaign = await requireCampaign(input.id, context.user.id);
		const link = await createCampaignAccessLink({
			organizationId: campaign.organizationId,
			campaignId: campaign.id,
			kind: input.kind,
			contactId: input.contactId,
			label: input.label,
			contextOverrides: input.contextOverrides as object | undefined,
			expiresAt: input.expiresAt,
			maxUses: input.maxUses,
		});
		return { link };
	});

export const attachKnowledgeBase = protectedProcedure
	.route({
		method: "POST",
		path: "/campaigns/{id}/knowledge-bases",
		tags: ["Campaigns"],
		summary: "Attach KB",
	})
	.input(z.object({ id: z.string(), knowledgeBaseId: z.string() }))
	.handler(async ({ input, context }) => {
		await requireCampaign(input.id, context.user.id);
		const link = await attachKnowledgeBaseToCampaign(
			input.id,
			input.knowledgeBaseId,
		);
		return { link };
	});

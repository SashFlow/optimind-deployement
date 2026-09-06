import { createId } from "@paralleldrive/cuid2";
import type {
	CampaignChannel,
	CampaignContactStatus,
	CampaignMode,
	CampaignPriority,
	CampaignSessionDirection,
	CampaignSessionStatus,
	CampaignStatus,
	Prisma,
} from "../generated/client";
import { db } from "../client";

export async function listCampaigns(organizationId: string) {
	return db.campaign.findMany({
		where: { organizationId, status: { not: "ARCHIVED" } },
		include: {
			agent: { select: { id: true, name: true } },
			_count: { select: { contacts: true, sessions: true } },
		},
		orderBy: { updatedAt: "desc" },
	});
}

export async function getCampaignById(id: string) {
	return db.campaign.findUnique({
		where: { id },
		include: {
			agent: { include: { publishedVersion: true } },
			knowledgeBases: { include: { knowledgeBase: true } },
			_count: {
				select: { contacts: true, sessions: true, accessLinks: true },
			},
		},
	});
}

export async function createCampaign(data: {
	organizationId: string;
	agentId: string;
	name: string;
	description?: string;
	mode: CampaignMode;
	channel: CampaignChannel;
	priority?: CampaignPriority;
	contextSchema?: Prisma.InputJsonValue;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.campaign.create({
		data: {
			organizationId: data.organizationId,
			agentId: data.agentId,
			name: data.name,
			description: data.description,
			mode: data.mode,
			channel: data.channel,
			priority: data.priority ?? "NORMAL",
			contextSchema: data.contextSchema ?? [],
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateCampaign(
	id: string,
	data: {
		name?: string;
		description?: string | null;
		status?: CampaignStatus;
		priority?: CampaignPriority;
		startAt?: Date | null;
		endAt?: Date | null;
		timezone?: string | null;
		callingWindowStartHour?: number | null;
		callingWindowEndHour?: number | null;
		maxConcurrentSessions?: number;
		maxAttemptsPerContact?: number;
		retryDelayMinutes?: number;
		publicToken?: string | null;
		embedEnabled?: boolean;
		inboundAddress?: string | null;
		contextSchema?: Prisma.InputJsonValue;
		metadata?: Prisma.InputJsonValue;
	},
) {
	return db.campaign.update({ where: { id }, data });
}

export async function listCampaignContacts(
	campaignId: string,
	opts?: { status?: CampaignContactStatus; limit?: number; offset?: number },
) {
	return db.campaignContact.findMany({
		where: {
			campaignId,
			...(opts?.status ? { status: opts.status } : {}),
		},
		take: opts?.limit ?? 50,
		skip: opts?.offset ?? 0,
		orderBy: { createdAt: "desc" },
	});
}

export async function createCampaignContact(data: {
	organizationId: string;
	campaignId: string;
	displayName?: string;
	phoneE164?: string;
	email?: string;
	timezone?: string;
	locale?: string;
	externalId?: string;
	context?: Prisma.InputJsonValue;
	consentGiven?: boolean;
	consentSource?: string;
}) {
	return db.campaignContact.create({
		data: {
			organizationId: data.organizationId,
			campaignId: data.campaignId,
			displayName: data.displayName,
			phoneE164: data.phoneE164,
			email: data.email,
			timezone: data.timezone,
			locale: data.locale,
			externalId: data.externalId,
			context: data.context ?? {},
			consentGiven: data.consentGiven ?? false,
			consentAt: data.consentGiven ? new Date() : undefined,
			consentSource: data.consentSource,
		},
	});
}

export async function updateCampaignContact(
	id: string,
	data: Prisma.CampaignContactUpdateInput,
) {
	return db.campaignContact.update({ where: { id }, data });
}

export async function getCampaignContactById(id: string) {
	return db.campaignContact.findUnique({ where: { id } });
}

export async function enqueueCampaignContacts(
	campaignId: string,
	contactIds?: string[],
) {
	return db.campaignContact.updateMany({
		where: {
			campaignId,
			doNotContact: false,
			status: { in: ["PENDING", "PAUSED", "RESCHEDULED", "FAILED"] },
			...(contactIds?.length ? { id: { in: contactIds } } : {}),
		},
		data: {
			status: "QUEUED",
			nextAttemptAt: new Date(),
		},
	});
}

export async function pauseCampaignContact(contactId: string) {
	return db.campaignContact.update({
		where: { id: contactId },
		data: { status: "PAUSED" },
	});
}

export async function rescheduleCampaignContact(
	contactId: string,
	nextAttemptAt: Date,
) {
	return db.campaignContact.update({
		where: { id: contactId },
		data: {
			status: "QUEUED",
			nextAttemptAt,
			lastOutcome: "RESCHEDULED",
		},
	});
}

export async function listQueuedContacts(campaignId: string, limit = 20) {
	return db.campaignContact.findMany({
		where: {
			campaignId,
			status: "QUEUED",
			doNotContact: false,
			OR: [
				{ nextAttemptAt: null },
				{ nextAttemptAt: { lte: new Date() } },
			],
		},
		orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
		take: limit,
	});
}

export async function getRecallContext(contactId: string, limit = 5) {
	const contact = await db.campaignContact.findUnique({
		where: { id: contactId },
	});
	if (!contact) return null;

	const priorSessions = await db.campaignSession.findMany({
		where: {
			contactId,
			status: { in: ["COMPLETED", "FAILED", "ABANDONED", "PAUSED"] },
		},
		orderBy: { startedAt: "desc" },
		take: limit,
		select: {
			id: true,
			status: true,
			startedAt: true,
			endedAt: true,
			summary: true,
			outcome: true,
			messages: true,
			transcript: true,
			contextSnapshot: true,
			direction: true,
			channel: true,
		},
	});

	return {
		contact,
		memorySummary: contact.memorySummary,
		priorSessions,
	};
}

export async function createCampaignSession(data: {
	organizationId: string;
	campaignId: string;
	contactId?: string;
	accessLinkId?: string;
	channel: CampaignChannel;
	direction?: CampaignSessionDirection;
	status?: CampaignSessionStatus;
	contextSnapshot?: Prisma.InputJsonValue;
	parentSessionId?: string;
	livekitRoomName?: string;
	livekitRoomSid?: string;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.campaignSession.create({
		data: {
			organizationId: data.organizationId,
			campaignId: data.campaignId,
			contactId: data.contactId,
			accessLinkId: data.accessLinkId,
			channel: data.channel,
			direction: data.direction ?? "WEB",
			status: data.status ?? "STARTED",
			contextSnapshot: data.contextSnapshot ?? {},
			parentSessionId: data.parentSessionId,
			livekitRoomName: data.livekitRoomName,
			livekitRoomSid: data.livekitRoomSid,
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateCampaignSession(
	id: string,
	data: Prisma.CampaignSessionUpdateInput,
) {
	return db.campaignSession.update({ where: { id }, data });
}

export async function listCampaignSessions(
	campaignId: string,
	opts?: { contactId?: string; limit?: number; offset?: number },
) {
	return db.campaignSession.findMany({
		where: {
			campaignId,
			...(opts?.contactId ? { contactId: opts.contactId } : {}),
		},
		take: opts?.limit ?? 50,
		skip: opts?.offset ?? 0,
		orderBy: { startedAt: "desc" },
	});
}

export async function createCampaignAccessLink(data: {
	organizationId: string;
	campaignId: string;
	kind: "OPEN" | "PERSONALIZED";
	contactId?: string;
	label?: string;
	contextOverrides?: Prisma.InputJsonValue;
	expiresAt?: Date;
	maxUses?: number;
}) {
	return db.campaignAccessLink.create({
		data: {
			organizationId: data.organizationId,
			campaignId: data.campaignId,
			kind: data.kind,
			contactId: data.contactId,
			token: createId(),
			label: data.label,
			contextOverrides: data.contextOverrides ?? {},
			expiresAt: data.expiresAt,
			maxUses: data.maxUses,
		},
	});
}

export async function attachKnowledgeBaseToCampaign(
	campaignId: string,
	knowledgeBaseId: string,
) {
	return db.campaignKnowledgeBase.upsert({
		where: {
			campaignId_knowledgeBaseId: { campaignId, knowledgeBaseId },
		},
		create: { campaignId, knowledgeBaseId },
		update: {},
	});
}

export async function updateContactMemory(
	contactId: string,
	memorySummary: string,
) {
	return db.campaignContact.update({
		where: { id: contactId },
		data: {
			memorySummary,
			memoryUpdatedAt: new Date(),
		},
	});
}

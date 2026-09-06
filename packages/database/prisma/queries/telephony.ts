import type {
	EgressJobStatus,
	EgressJobType,
	Prisma,
	SipTrunkDirection,
} from "../generated/client";
import { db } from "../client";

export async function listPhoneNumbers(organizationId: string) {
	return db.phoneNumber.findMany({
		where: { organizationId },
		include: { sipTrunk: true, campaign: true, agent: true },
		orderBy: { createdAt: "desc" },
	});
}

export async function upsertPhoneNumber(data: {
	organizationId: string;
	e164: string;
	plivoNumberId?: string;
	friendlyName?: string;
	capabilities?: Prisma.InputJsonValue;
	campaignId?: string | null;
	agentId?: string | null;
	sipTrunkId?: string | null;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.phoneNumber.upsert({
		where: {
			organizationId_e164: {
				organizationId: data.organizationId,
				e164: data.e164,
			},
		},
		create: {
			organizationId: data.organizationId,
			e164: data.e164,
			plivoNumberId: data.plivoNumberId,
			friendlyName: data.friendlyName,
			capabilities: data.capabilities ?? {},
			campaignId: data.campaignId ?? undefined,
			agentId: data.agentId ?? undefined,
			sipTrunkId: data.sipTrunkId ?? undefined,
			metadata: data.metadata ?? {},
		},
		update: {
			plivoNumberId: data.plivoNumberId,
			friendlyName: data.friendlyName,
			capabilities: data.capabilities,
			campaignId: data.campaignId,
			agentId: data.agentId,
			sipTrunkId: data.sipTrunkId,
			metadata: data.metadata,
		},
	});
}

export async function listSipTrunks(organizationId: string) {
	return db.sipTrunk.findMany({
		where: { organizationId },
		include: { phoneNumbers: true, dispatchRules: true },
		orderBy: { createdAt: "desc" },
	});
}

export async function createSipTrunk(data: {
	organizationId: string;
	name: string;
	direction: SipTrunkDirection;
	livekitTrunkId?: string;
	plivoTrunkId?: string;
	plivoUriId?: string;
	plivoCredentialId?: string;
	authUsername?: string;
	hasCredentials?: boolean;
	numbers?: string[];
	metadata?: Prisma.InputJsonValue;
}) {
	return db.sipTrunk.create({
		data: {
			organizationId: data.organizationId,
			name: data.name,
			direction: data.direction,
			livekitTrunkId: data.livekitTrunkId,
			plivoTrunkId: data.plivoTrunkId,
			plivoUriId: data.plivoUriId,
			plivoCredentialId: data.plivoCredentialId,
			authUsername: data.authUsername,
			hasCredentials: data.hasCredentials ?? false,
			numbers: data.numbers ?? [],
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateSipTrunk(
	id: string,
	data: Prisma.SipTrunkUpdateInput,
) {
	return db.sipTrunk.update({ where: { id }, data });
}

export async function listDispatchRules(organizationId: string) {
	return db.dispatchRule.findMany({
		where: { organizationId },
		include: { sipTrunk: true, agent: true, campaign: true },
		orderBy: { createdAt: "desc" },
	});
}

export async function createDispatchRule(data: {
	organizationId: string;
	name: string;
	sipTrunkId?: string;
	agentId?: string;
	campaignId?: string;
	livekitDispatchRuleId?: string;
	roomPrefix?: string;
	ruleConfig?: Prisma.InputJsonValue;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.dispatchRule.create({
		data: {
			organizationId: data.organizationId,
			name: data.name,
			sipTrunkId: data.sipTrunkId,
			agentId: data.agentId,
			campaignId: data.campaignId,
			livekitDispatchRuleId: data.livekitDispatchRuleId,
			roomPrefix: data.roomPrefix,
			ruleConfig: data.ruleConfig ?? {},
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateDispatchRule(
	id: string,
	data: Prisma.DispatchRuleUpdateInput,
) {
	return db.dispatchRule.update({ where: { id }, data });
}

export async function listCustomVoices(organizationId: string) {
	return db.customVoice.findMany({
		where: { organizationId },
		orderBy: { createdAt: "desc" },
	});
}

export async function createCustomVoice(data: {
	organizationId: string;
	name: string;
	livekitVoiceId?: string;
	sampleStorageKeys?: string[];
	metadata?: Prisma.InputJsonValue;
}) {
	return db.customVoice.create({
		data: {
			organizationId: data.organizationId,
			name: data.name,
			livekitVoiceId: data.livekitVoiceId,
			sampleStorageKeys: data.sampleStorageKeys ?? [],
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateCustomVoice(
	id: string,
	data: Prisma.CustomVoiceUpdateInput,
) {
	return db.customVoice.update({ where: { id }, data });
}

export async function createEgressJob(data: {
	organizationId: string;
	type: EgressJobType;
	campaignSessionId?: string;
	livekitEgressId?: string;
	roomName?: string;
	status?: EgressJobStatus;
	outputUrls?: string[];
	metadata?: Prisma.InputJsonValue;
}) {
	return db.egressJob.create({
		data: {
			organizationId: data.organizationId,
			type: data.type,
			campaignSessionId: data.campaignSessionId,
			livekitEgressId: data.livekitEgressId,
			roomName: data.roomName,
			status: data.status ?? "STARTING",
			outputUrls: data.outputUrls ?? [],
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateEgressJob(
	id: string,
	data: Prisma.EgressJobUpdateInput,
) {
	return db.egressJob.update({ where: { id }, data });
}

export async function listEgressJobs(organizationId: string) {
	return db.egressJob.findMany({
		where: { organizationId },
		orderBy: { createdAt: "desc" },
		take: 100,
	});
}

export async function getEgressJobById(id: string) {
	return db.egressJob.findUnique({ where: { id } });
}

export async function getSipTrunkById(id: string) {
	return db.sipTrunk.findUnique({
		where: { id },
		include: { phoneNumbers: true, dispatchRules: true },
	});
}

export async function getPhoneNumberById(id: string) {
	return db.phoneNumber.findUnique({ where: { id } });
}

export async function getDispatchRuleById(id: string) {
	return db.dispatchRule.findUnique({ where: { id } });
}

export async function getCustomVoiceById(id: string) {
	return db.customVoice.findUnique({ where: { id } });
}

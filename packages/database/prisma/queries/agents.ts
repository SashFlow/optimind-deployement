import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import type {
	AgentStatus,
	AgentTrial,
	AgentVersionStatus,
	Prisma,
} from "../generated/client";

export async function listAgents(organizationId: string) {
	return db.agent.findMany({
		where: { organizationId, status: { not: "DELETED" } },
		include: {
			draftVersion: true,
			publishedVersion: true,
			knowledgeBases: { include: { knowledgeBase: true } },
		},
		orderBy: { updatedAt: "desc" },
	});
}

export async function getAgentById(id: string) {
	return db.agent.findUnique({
		where: { id },
		include: {
			draftVersion: true,
			publishedVersion: true,
			versions: { orderBy: { createdAt: "desc" } },
			knowledgeBases: { include: { knowledgeBase: true } },
			trials: true,
		},
	});
}

export async function createAgent(data: {
	organizationId: string;
	name: string;
	description?: string;
	config?: Prisma.InputJsonValue;
}) {
	const versionId = createId();
	const agentId = createId();

	return db.$transaction(async (tx) => {
		await tx.agent.create({
			data: {
				id: agentId,
				organizationId: data.organizationId,
				name: data.name,
				description: data.description,
			},
		});

		await tx.agentVersion.create({
			data: {
				id: versionId,
				agentId,
				organizationId: data.organizationId,
				isDraft: true,
				version: "DRAFT",
				config: data.config ?? {},
			},
		});

		return tx.agent.update({
			where: { id: agentId },
			data: { draftVersionId: versionId },
			include: { draftVersion: true, publishedVersion: true },
		});
	});
}

export async function updateAgent(
	id: string,
	data: {
		name?: string;
		description?: string | null;
		status?: AgentStatus;
		embedEnabled?: boolean;
		token?: string | null;
	},
) {
	return db.agent.update({
		where: { id },
		data,
		include: { draftVersion: true, publishedVersion: true },
	});
}

export async function updateAgentDraftConfig(
	agentId: string,
	config: Prisma.InputJsonValue,
) {
	const agent = await db.agent.findUnique({ where: { id: agentId } });
	if (!agent?.draftVersionId) {
		throw new Error("Agent has no draft version");
	}

	return db.agentVersion.update({
		where: { id: agent.draftVersionId },
		data: { config },
	});
}

export async function publishAgentVersion(agentId: string) {
	const agent = await getAgentById(agentId);
	if (!agent?.draftVersion) {
		throw new Error("Agent has no draft version");
	}

	const publishedId = createId();

	return db.$transaction(async (tx) => {
		await tx.agentVersion.create({
			data: {
				id: publishedId,
				agentId,
				organizationId: agent.organizationId,
				isDraft: false,
				version: "PUBLISHED" satisfies AgentVersionStatus,
				config: agent.draftVersion?.config ?? {},
			},
		});

		const newDraftId = createId();
		await tx.agentVersion.create({
			data: {
				id: newDraftId,
				agentId,
				organizationId: agent.organizationId,
				isDraft: true,
				version: "DRAFT",
				config: agent.draftVersion?.config ?? {},
			},
		});

		return tx.agent.update({
			where: { id: agentId },
			data: {
				publishedVersionId: publishedId,
				draftVersionId: newDraftId,
			},
			include: { draftVersion: true, publishedVersion: true },
		});
	});
}

export async function attachKnowledgeBaseToAgent(
	agentId: string,
	knowledgeBaseId: string,
) {
	return db.agentKnowledgeBase.upsert({
		where: {
			agentId_knowledgeBaseId: { agentId, knowledgeBaseId },
		},
		create: { agentId, knowledgeBaseId },
		update: {},
	});
}

export async function detachKnowledgeBaseFromAgent(
	agentId: string,
	knowledgeBaseId: string,
) {
	return db.agentKnowledgeBase.delete({
		where: {
			agentId_knowledgeBaseId: { agentId, knowledgeBaseId },
		},
	});
}

export async function syncAgentKnowledgeBases(
	agentId: string,
	knowledgeBaseIds: string[],
) {
	const desired = [...new Set(knowledgeBaseIds)];
	const existing = await db.agentKnowledgeBase.findMany({
		where: { agentId },
		select: { knowledgeBaseId: true },
	});
	const existingIds = new Set(existing.map((row) => row.knowledgeBaseId));
	const desiredIds = new Set(desired);

	const toAttach = desired.filter((id) => !existingIds.has(id));
	const toDetach = [...existingIds].filter((id) => !desiredIds.has(id));

	await db.$transaction(async (tx) => {
		for (const knowledgeBaseId of toAttach) {
			await tx.agentKnowledgeBase.upsert({
				where: {
					agentId_knowledgeBaseId: { agentId, knowledgeBaseId },
				},
				create: { agentId, knowledgeBaseId },
				update: {},
			});
		}
		for (const knowledgeBaseId of toDetach) {
			await tx.agentKnowledgeBase.delete({
				where: {
					agentId_knowledgeBaseId: { agentId, knowledgeBaseId },
				},
			});
		}
	});
}

export async function listAgentTrials(agentId: string) {
	return db.agentTrial.findMany({
		where: { agentId },
		orderBy: { createdAt: "desc" },
	});
}

export async function createAgentTrial(data: {
	agentId: string;
	label: string;
	usageLimit: number;
	expiresAt?: Date | null;
}) {
	return db.agentTrial.create({
		data: {
			agentId: data.agentId,
			label: data.label,
			usageLimit: data.usageLimit,
			expiresAt: data.expiresAt ?? null,
			enabled: true,
			token: createId(),
		},
	});
}

export async function updateAgentTrial(
	id: string,
	data: {
		label?: string;
		usageLimit?: number;
		expiresAt?: Date | null;
		enabled?: boolean;
	},
) {
	return db.agentTrial.update({
		where: { id },
		data,
	});
}

export async function deleteAgentTrial(id: string) {
	return db.agentTrial.delete({
		where: { id },
	});
}

export async function getAgentTrialById(id: string) {
	return db.agentTrial.findUnique({
		where: { id },
		include: {
			agent: {
				include: {
					draftVersion: true,
					publishedVersion: true,
				},
			},
		},
	});
}

export async function getAgentTrialByToken(token: string) {
	return db.agentTrial.findUnique({
		where: { token },
		include: {
			agent: {
				include: {
					draftVersion: true,
					publishedVersion: true,
				},
			},
		},
	});
}

export async function consumeAgentTrialToken(
	token: string,
): Promise<AgentTrial | null> {
	return db.$transaction(async (tx) => {
		const trial = await tx.agentTrial.findUnique({
			where: { token },
		});
		if (!trial) {
			return null;
		}
		if (!trial.enabled) {
			return null;
		}
		if (trial.expiresAt && trial.expiresAt.getTime() < Date.now()) {
			return null;
		}
		if (trial.usageCount >= trial.usageLimit) {
			return null;
		}

		return tx.agentTrial.update({
			where: { id: trial.id },
			data: { usageCount: { increment: 1 } },
		});
	});
}

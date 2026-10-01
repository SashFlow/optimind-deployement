import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import type { Prisma } from "../generated/client";

function toJson(value: unknown): Prisma.InputJsonValue {
	return (value ?? {}) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

type EndUserInput = {
	organizationId: string;
	agentId: string;
	name: string;
	email?: string | null;
	phone?: string | null;
	metadata?: Record<string, unknown>;
};

/** Find-or-create a stable end user (logged-in user, phone number). */
export async function upsertEndUser(data: EndUserInput & { identity: string }) {
	const existing = await db.endUser.findUnique({
		where: {
			agentId_identity: {
				agentId: data.agentId,
				identity: data.identity,
			},
		},
	});
	if (existing) {
		return db.endUser.update({
			where: { id: existing.id },
			data: {
				name: data.name,
				email: data.email ?? existing.email,
				phone: data.phone ?? existing.phone,
				metadata: toJson({
					...asRecord(existing.metadata),
					...(data.metadata ?? {}),
				}),
			},
		});
	}
	return db.endUser.create({
		data: {
			organizationId: data.organizationId,
			agentId: data.agentId,
			identity: data.identity,
			name: data.name,
			email: data.email ?? null,
			phone: data.phone ?? null,
			metadata: toJson(data.metadata),
		},
	});
}

/** Always creates a new, single-use end user (trial visitors, anonymous web). */
export async function createEphemeralEndUser(
	data: EndUserInput & { identityPrefix: string },
) {
	return db.endUser.create({
		data: {
			organizationId: data.organizationId,
			agentId: data.agentId,
			identity: `${data.identityPrefix}:${createId()}`,
			name: data.name,
			email: data.email ?? null,
			phone: data.phone ?? null,
			metadata: toJson(data.metadata),
		},
	});
}

export async function getEndUserById(id: string) {
	return db.endUser.findUnique({
		where: { id },
		include: {
			agent: { select: { id: true, name: true } },
			sessions: {
				orderBy: { createdAt: "desc" },
				take: 20,
				include: { files: { orderBy: { createdAt: "desc" } } },
			},
			_count: { select: { sessions: true } },
		},
	});
}

export async function listEndUsers(
	organizationId: string,
	opts?: { agentId?: string; q?: string; take?: number; skip?: number },
) {
	const q = opts?.q?.trim();
	const contains = { contains: q, mode: "insensitive" as const };
	return db.endUser.findMany({
		where: {
			organizationId,
			agentId: opts?.agentId,
			...(q
				? {
						OR: [
							{ name: contains },
							{ identity: contains },
							{ email: contains },
							{ phone: { contains: q } },
						],
					}
				: {}),
		},
		include: { _count: { select: { sessions: true } } },
		orderBy: { updatedAt: "desc" },
		take: opts?.take ?? 50,
		skip: opts?.skip ?? 0,
	});
}

export async function setEndUserMemory(id: string, memory: string[]) {
	return db.endUser.update({ where: { id }, data: { memory } });
}

export async function createSessionFile(data: {
	organizationId: string;
	sessionId: string;
	endUserId: string;
	name: string;
	storageKey: string;
	type: string;
	size: number;
}) {
	return db.$transaction(async (tx) => {
		const file = await tx.sessionFile.create({
			data: {
				organizationId: data.organizationId,
				sessionId: data.sessionId,
				name: data.name,
				url: data.storageKey,
				type: data.type,
				size: data.size,
			},
		});
		await tx.endUser.update({
			where: { id: data.endUserId },
			data: { files: { push: data.storageKey } },
		});
		return file;
	});
}

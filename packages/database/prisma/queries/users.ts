import type { z } from "zod";
import { db } from "../client";
import type { UserSchema } from "../zod";

export async function getUsers({
	limit,
	offset,
	query,
}: {
	limit: number;
	offset: number;
	query?: string;
}) {
	return await db.user.findMany({
		where: query
			? {
					name: {
						contains: query,
					},
				}
			: undefined,
		include: {
			members: {
				select: {
					id: true,
					role: true,
					organizationId: true,
					organization: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
		},
		take: limit,
		skip: offset,
	});
}

export async function upsertOrganizationMembership({
	userId,
	organizationId,
	role,
}: {
	userId: string;
	organizationId: string;
	role: string;
}) {
	return db.member.upsert({
		where: {
			organizationId_userId: {
				organizationId,
				userId,
			},
		},
		create: {
			userId,
			organizationId,
			role,
			createdAt: new Date(),
		},
		update: {
			role,
		},
	});
}

export async function updateOrganizationMembershipRole({
	memberId,
	role,
}: {
	memberId: string;
	role: string;
}) {
	return db.member.update({
		where: { id: memberId },
		data: { role },
	});
}

export async function countAllUsers() {
	return await db.user.count();
}

export async function getUserById(id: string) {
	return await db.user.findUnique({
		where: {
			id,
		},
	});
}

export async function getUserByEmail(email: string) {
	return await db.user.findUnique({
		where: {
			email,
		},
	});
}

export async function createUser({
	email,
	name,
	role,
	emailVerified,
	onboardingComplete,
}: {
	email: string;
	name: string;
	role: "admin" | "user";
	emailVerified: boolean;
	onboardingComplete: boolean;
}) {
	return await db.user.create({
		data: {
			email,
			name,
			role,
			emailVerified,
			onboardingComplete,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function getAccountById(id: string) {
	return await db.account.findUnique({
		where: {
			id,
		},
	});
}

export async function createUserAccount({
	userId,
	providerId,
	accountId,
	hashedPassword,
}: {
	userId: string;
	providerId: string;
	accountId: string;
	hashedPassword?: string;
}) {
	return await db.account.create({
		data: {
			userId,
			accountId,
			providerId,
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function updateUser(
	user: Partial<z.infer<typeof UserSchema>> & { id: string },
) {
	return await db.user.update({
		where: {
			id: user.id,
		},
		data: user,
	});
}

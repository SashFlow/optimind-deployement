import type { Prisma } from "../generated/client";
import { db } from "../client";

export async function listAvatarProfiles(organizationId: string) {
	return db.avatarProfile.findMany({
		where: { organizationId },
		orderBy: { createdAt: "desc" },
	});
}

export async function getAvatarProfileById(id: string) {
	return db.avatarProfile.findUnique({ where: { id } });
}

export async function createAvatarProfile(data: {
	organizationId: string;
	name: string;
	anamAvatarId: string;
	anamPersonaId?: string;
	previewUrl?: string;
	metadata?: Prisma.InputJsonValue;
}) {
	return db.avatarProfile.create({
		data: {
			organizationId: data.organizationId,
			name: data.name,
			anamAvatarId: data.anamAvatarId,
			anamPersonaId: data.anamPersonaId,
			previewUrl: data.previewUrl,
			metadata: data.metadata ?? {},
		},
	});
}

export async function updateAvatarProfile(
	id: string,
	data: {
		name?: string;
		anamAvatarId?: string;
		anamPersonaId?: string | null;
		previewUrl?: string | null;
		metadata?: Prisma.InputJsonValue;
	},
) {
	return db.avatarProfile.update({ where: { id }, data });
}

export async function deleteAvatarProfile(id: string) {
	return db.avatarProfile.delete({ where: { id } });
}

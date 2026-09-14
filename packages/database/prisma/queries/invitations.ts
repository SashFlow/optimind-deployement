import { db } from "../client";

const INVITATION_TTL_MS = 60 * 60 * 48 * 1000;

export async function getInvitationById(id: string) {
	return db.invitation.findUnique({
		where: { id },
		include: {
			organization: true,
		},
	});
}

export async function getPendingInvitationByEmail(email: string) {
	return db.invitation.findFirst({
		where: {
			email: email.toLowerCase(),
			status: "pending",
		},
	});
}

export async function getValidPendingInvitation(id: string) {
	const invitation = await getInvitationById(id);
	if (!invitation) {
		return null;
	}
	if (invitation.status !== "pending") {
		return null;
	}
	if (invitation.expiresAt.getTime() < Date.now()) {
		return null;
	}
	return invitation;
}

export async function listPendingInvitationsByOrganization(
	organizationId: string,
) {
	return db.invitation.findMany({
		where: {
			organizationId,
			status: "pending",
		},
		orderBy: {
			expiresAt: "asc",
		},
	});
}

export async function deletePendingInvitations({
	email,
	organizationId,
}: {
	email: string;
	organizationId: string;
}) {
	return db.invitation.deleteMany({
		where: {
			email: email.toLowerCase(),
			organizationId,
			status: "pending",
		},
	});
}

export async function createOrganizationInvitation({
	email,
	role,
	platformRole = "user",
	organizationId,
	inviterId,
}: {
	email: string;
	role: string;
	platformRole?: "admin" | "user";
	organizationId: string;
	inviterId: string;
}) {
	return db.invitation.create({
		data: {
			email: email.toLowerCase(),
			role,
			platformRole,
			organizationId,
			inviterId,
			status: "pending",
			expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
		},
		include: {
			organization: true,
		},
	});
}

export async function markInvitationAccepted(id: string) {
	return db.invitation.update({
		where: { id },
		data: { status: "accepted" },
	});
}

export async function removeOrganizationMember({
	organizationId,
	userId,
}: {
	organizationId: string;
	userId: string;
}) {
	return db.member.deleteMany({
		where: {
			organizationId,
			userId,
		},
	});
}

export async function countUserMemberships(userId: string) {
	return db.member.count({
		where: { userId },
	});
}

export async function deleteUserById(userId: string) {
	return db.user.delete({
		where: { id: userId },
	});
}

import {
	countUserMemberships,
	createOrganizationInvitation,
	createUser,
	createUserAccount,
	db,
	deletePendingInvitations,
	deleteUserById,
	getOrganizationById,
	getUserByEmail,
	getValidPendingInvitation,
	markInvitationAccepted,
	removeOrganizationMember,
	upsertOrganizationMembership,
} from "@repo/database";
import type { Locale } from "@repo/i18n";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { hashPassword } from "better-auth/crypto";
import { updateSeatsInOrganizationSubscription } from "./organization";

export function buildOrganizationInviteUrl({
	invitationId,
	email,
	existingUser,
}: {
	invitationId: string;
	email: string;
	existingUser: boolean;
}) {
	const url = new URL(
		existingUser ? "/auth/login" : "/auth/signup",
		getBaseUrl(),
	);
	url.searchParams.set("invitationId", invitationId);
	url.searchParams.set("email", email);
	return url.toString();
}

async function sendOrganizationInvitationEmail({
	email,
	invitationId,
	organizationName,
	locale,
}: {
	email: string;
	invitationId: string;
	organizationName: string;
	locale?: Locale;
}) {
	const existingUser = await getUserByEmail(email);
	const inviteUrl = buildOrganizationInviteUrl({
		invitationId,
		email,
		existingUser: Boolean(existingUser),
	});

	try {
		await sendEmail({
			to: email,
			templateId: "organizationInvitation",
			locale,
			context: {
				organizationName,
				url: inviteUrl,
			},
		});
		return { inviteUrl, emailSent: true as const };
	} catch (error) {
		logger.error("Failed to send organization invitation email", {
			email,
			error,
		});
		return {
			inviteUrl,
			emailSent: false as const,
			emailError:
				error instanceof Error
					? error.message
					: "Failed to send invitation email",
		};
	}
}

/**
 * Rotates any pending invite for email+org, creates a new Invitation token,
 * emails the signup URL, and returns that URL.
 */
export async function inviteToOrganization({
	email,
	role,
	platformRole = "user",
	organizationId,
	inviterId,
	locale,
}: {
	email: string;
	role: string;
	platformRole?: "admin" | "user";
	organizationId: string;
	inviterId: string;
	locale?: Locale;
}) {
	const organization = await getOrganizationById(organizationId);
	if (!organization) {
		throw new Error("Organization not found");
	}

	const normalizedEmail = email.trim().toLowerCase();

	const alreadyMember = await db.member.findFirst({
		where: {
			organizationId,
			user: { email: normalizedEmail },
		},
	});
	if (alreadyMember) {
		throw new Error("User is already a member of this organization");
	}

	await deletePendingInvitations({
		email: normalizedEmail,
		organizationId,
	});

	const invitation = await createOrganizationInvitation({
		email: normalizedEmail,
		role,
		platformRole,
		organizationId,
		inviterId,
	});

	const emailResult = await sendOrganizationInvitationEmail({
		email: normalizedEmail,
		invitationId: invitation.id,
		organizationName: organization.name,
		locale,
	});

	return {
		invitationId: invitation.id,
		...emailResult,
	};
}

export async function validateInvitation(invitationId: string) {
	const invitation = await getValidPendingInvitation(invitationId);
	if (!invitation) {
		return null;
	}

	return {
		id: invitation.id,
		email: invitation.email,
		role: invitation.role ?? "member",
		organizationId: invitation.organizationId,
		organizationName: invitation.organization.name,
		expiresAt: invitation.expiresAt.toISOString(),
	};
}

/**
 * Consumes a pending invitation: creates the user from invitation.email,
 * adds org membership from invitation.role/organizationId, marks accepted.
 * Does not trust client-supplied email/role/org.
 */
export async function signupWithInvitation({
	invitationId,
	name,
	password,
}: {
	invitationId: string;
	name: string;
	password: string;
}) {
	const invitation = await getValidPendingInvitation(invitationId);
	if (!invitation) {
		throw new Error("Invalid or expired invitation");
	}

	const email = invitation.email;
	const existing = await getUserByEmail(email);
	if (existing) {
		throw new Error(
			"An account with this email already exists. Sign in to accept the invitation.",
		);
	}

	const hashedPassword = await hashPassword(password);
	const platformRole = invitation.platformRole === "admin" ? "admin" : "user";
	const user = await createUser({
		email,
		name: name.trim(),
		role: platformRole,
		emailVerified: true,
		onboardingComplete: false,
	});

	await createUserAccount({
		userId: user.id,
		providerId: "credential",
		accountId: user.id,
		hashedPassword,
	});

	await upsertOrganizationMembership({
		userId: user.id,
		organizationId: invitation.organizationId,
		role: invitation.role ?? "member",
	});

	await markInvitationAccepted(invitation.id);

	try {
		await updateSeatsInOrganizationSubscription(invitation.organizationId);
	} catch (error) {
		logger.error("Failed to update seats after invitation signup", {
			organizationId: invitation.organizationId,
			error,
		});
	}

	return {
		email: user.email,
		userId: user.id,
		organizationId: invitation.organizationId,
	};
}

export async function revokeOrganizationInvite({
	email,
	organizationId,
}: {
	email: string;
	organizationId: string;
}) {
	const normalizedEmail = email.trim().toLowerCase();

	await deletePendingInvitations({
		email: normalizedEmail,
		organizationId,
	});

	const user = await getUserByEmail(normalizedEmail);
	if (!user) {
		return { deletedUser: false };
	}

	await removeOrganizationMember({
		organizationId,
		userId: user.id,
	});

	try {
		await updateSeatsInOrganizationSubscription(organizationId);
	} catch (error) {
		logger.error("Failed to update seats after invite revoke", {
			organizationId,
			error,
		});
	}

	const remaining = await countUserMemberships(user.id);
	if (remaining === 0) {
		await deleteUserById(user.id);
		return { deletedUser: true };
	}

	return { deletedUser: false };
}

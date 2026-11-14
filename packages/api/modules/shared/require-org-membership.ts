import { ORPCError } from "@orpc/client";
import { getOrganizationById, getUserById } from "@repo/database";
import { verifyOrganizationMembership } from "../organizations/lib/membership";

export async function requireOrgMembership(
	organizationId: string,
	userId: string,
) {
	const membership = await verifyOrganizationMembership(
		organizationId,
		userId,
	);
	if (membership) {
		return membership;
	}

	// Platform admins can operate on any organization without membership.
	const user = await getUserById(userId);
	if (user?.role === "admin") {
		const organization = await getOrganizationById(organizationId);
		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}
		return {
			organization,
			role: "admin" as const,
		};
	}

	throw new ORPCError("FORBIDDEN");
}

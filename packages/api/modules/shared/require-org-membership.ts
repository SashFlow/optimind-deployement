import { ORPCError } from "@orpc/client";
import { verifyOrganizationMembership } from "../organizations/lib/membership";

export async function requireOrgMembership(
	organizationId: string,
	userId: string,
) {
	const membership = await verifyOrganizationMembership(
		organizationId,
		userId,
	);
	if (!membership) {
		throw new ORPCError("FORBIDDEN");
	}
	return membership;
}

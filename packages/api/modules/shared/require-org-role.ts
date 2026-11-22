import { ORPCError } from "@orpc/client";
import { requireOrgMembership } from "./require-org-membership";

const PRIVILEGED = new Set(["owner", "admin"]);

/**
 * Require organization owner/admin (or platform admin via requireOrgMembership).
 * Use for audit logs, billing, telephony admin, and similar sensitive APIs.
 */
export async function requireOrgAdmin(organizationId: string, userId: string) {
	const membership = await requireOrgMembership(organizationId, userId);
	if (!PRIVILEGED.has(membership.role)) {
		throw new ORPCError("FORBIDDEN");
	}
	return membership;
}

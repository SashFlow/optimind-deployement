import { listAuditLogs } from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

const actionTypeSchema = z.enum([
	"CREATE",
	"UPDATE",
	"DELETE",
	"PUBLISH",
	"INVITE",
	"LOGIN",
	"LOGOUT",
]);

export const list = protectedProcedure
	.route({
		method: "GET",
		path: "/audit-logs",
		tags: ["Audit"],
		summary: "List organization audit logs",
	})
	.input(
		z.object({
			organizationId: z.string(),
			actionType: actionTypeSchema.optional(),
			/** Accepts UI lowercase or DB enum-style values */
			action: z.string().optional(),
			resourceType: z.string().optional(),
			limit: z.number().int().positive().max(500).optional(),
			offset: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const actionRaw = input.actionType ?? input.action;
		const actionType = actionRaw
			? actionTypeSchema.parse(actionRaw.toUpperCase())
			: undefined;

		const { rows, total } = await listAuditLogs(input.organizationId, {
			actionType,
			resourceType: input.resourceType,
			limit: input.limit,
			offset: input.offset,
		});

		return {
			total,
			logs: rows.map((row) => ({
				id: row.id,
				occurred_at: row.createdAt.toISOString(),
				action: row.actionType.toLowerCase(),
				resource_type: row.resourceType,
				resource_id: row.resourceId,
				actor_account_id: row.userId,
				ip: row.ipAddress,
				actor_type: row.actorType,
			})),
		};
	});

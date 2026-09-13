import { ORPCError } from "@orpc/client";
import { fillOrganizationDemoDashboardData } from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

export const fillDemoData = adminProcedure
	.route({
		method: "POST",
		path: "/admin/organizations/{organizationId}/fill-demo-data",
		tags: ["Administration"],
		summary: "Fill organization with demo dashboard KPI data",
	})
	.input(
		z.object({
			organizationId: z.string().min(1),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		try {
			const result =
				await fillOrganizationDemoDashboardData(organizationId);
			return result;
		} catch (cause) {
			const message =
				cause instanceof Error
					? cause.message
					: "Unable to fill demo data";
			if (message === "Organization not found") {
				throw new ORPCError("NOT_FOUND", { message });
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
		}
	});

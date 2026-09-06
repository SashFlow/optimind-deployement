import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { agentsRouter } from "../modules/agents/router";
import { aiRouter } from "../modules/ai/router";
import { appointmentsRouter } from "../modules/appointments/routes";
import { avatarsRouter } from "../modules/avatars/router";
import { browserRouter } from "../modules/browser/routes";
import { campaignsRouter } from "../modules/campaigns/router";
import { contactRouter } from "../modules/contact/router";
import { linkRouter } from "../modules/demo-links/routes";
import { knowledgeRouter } from "../modules/knowledge/router";
import { metricsRouter } from "../modules/metrics/router";
import { newsletterRouter } from "../modules/newsletter/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { telephonyRouter } from "../modules/telephony/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure
	// Prefix for openapi
	.prefix("/api")
	.router({
		admin: adminRouter,
		newsletter: newsletterRouter,
		contact: contactRouter,
		organizations: organizationsRouter,
		users: usersRouter,
		payments: paymentsRouter,
		ai: aiRouter,
		browser: browserRouter,
		appointments: appointmentsRouter,
		links: linkRouter,
		agents: agentsRouter,
		campaigns: campaignsRouter,
		knowledge: knowledgeRouter,
		telephony: telephonyRouter,
		avatars: avatarsRouter,
		metrics: metricsRouter,
	});

export type ApiRouterClient = RouterClient<typeof router>;

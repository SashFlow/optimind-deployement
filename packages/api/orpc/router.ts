import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { agentsRouter } from "../modules/agents/router";
import { avatarsRouter } from "../modules/avatars/router";
import { campaignsRouter } from "../modules/campaigns/router";
import { contactRouter } from "../modules/contact/router";
import { knowledgeRouter } from "../modules/knowledge/router";
import { metricsRouter } from "../modules/metrics/router";
import { newsletterRouter } from "../modules/newsletter/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { sessionsRouter } from "../modules/sessions/router";
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
		agents: agentsRouter,
		campaigns: campaignsRouter,
		knowledge: knowledgeRouter,
		telephony: telephonyRouter,
		avatars: avatarsRouter,
		metrics: metricsRouter,
		sessions: sessionsRouter,
	});

export type ApiRouterClient = RouterClient<typeof router>;

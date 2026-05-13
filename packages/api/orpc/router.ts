import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { aiRouter } from "../modules/ai/router";
import { browserRouter } from "../modules/browser/routes";
import { contactRouter } from "../modules/contact/router";
import { newsletterRouter } from "../modules/newsletter/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { tokenRouter } from "../modules/token/router";
import { usersRouter } from "../modules/users/router";
import { linkRouter } from "../modules/demo-links/routes";
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
		token: tokenRouter,
		browser: browserRouter,
		links: linkRouter,
	});

export type ApiRouterClient = RouterClient<typeof router>;

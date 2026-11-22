import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { auth } from "@repo/auth";
import { config } from "@repo/config";
import { logger } from "@repo/logs";
import { webhookHandler as paymentsWebhookHandler } from "@repo/payments";
import { getBaseUrl } from "@repo/utils";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { mergeOpenApiSchemas } from "./lib/openapi-schema";
import { checkRateLimit, getClientIp } from "./modules/shared/rate-limit";
import { verifyWebhookHmac } from "./modules/shared/signed-token";
import { livekitWebhookHandler } from "./modules/sessions/webhooks/livekit";
import { openApiHandler, rpcHandler } from "./orpc/handler";
import { router } from "./orpc/router";

const isProd = process.env.NODE_ENV === "production";
const allowOpenApiDocs = process.env.ALLOW_OPENAPI_DOCS === "true" || !isProd;

async function requireOpenApiAccess(c: {
	req: { raw: Request };
}): Promise<Response | null> {
	if (allowOpenApiDocs) {
		return null;
	}
	const session = await auth.api
		.getSession({ headers: c.req.raw.headers })
		.catch(() => null);
	if (session?.user?.role === "admin") {
		return null;
	}
	return new Response("Not Found", { status: 404 });
}

export const app = new Hono()
	.basePath("/api")
	// Logger middleware
	.use(honoLogger((message, ...rest) => logger.log(message, ...rest)))
	// Cors middleware
	.use(
		cors({
			origin: getBaseUrl(),
			allowHeaders: [
				"Content-Type",
				"Authorization",
				"X-Worker-Api-Key",
				"X-Webhook-Signature",
				"X-Webhook-Timestamp",
			],
			allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			maxAge: 600,
			credentials: true,
		}),
	)
	// Global abuse protection (auth + public endpoints share this ceiling)
	.use("*", async (c, next) => {
		const ip = getClientIp(c.req.raw.headers);
		const path = c.req.path;
		const isAuth = path.includes("/auth/");
		const isPublicSensitive =
			path.includes("/aadhaar") ||
			path.includes("/newsletter") ||
			path.includes("/contact") ||
			path.includes("/workflows/hooks");
		const limit = isAuth ? 40 : isPublicSensitive ? 20 : 120;
		const result = checkRateLimit(`api:${ip}:${isAuth ? "auth" : "gen"}`, {
			limit,
			windowMs: 60_000,
		});
		if (!result.ok) {
			return c.text("Too Many Requests", 429, {
				"Retry-After": String(result.retryAfterSec),
			});
		}
		await next();
	})
	// Auth handler
	.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
	// OpenAPI schema endpoint (gated in production)
	.get("/openapi", async (c) => {
		const denied = await requireOpenApiAccess(c);
		if (denied) {
			return denied;
		}
		const authSchema = await auth.api.generateOpenAPISchema();

		const appSchema = await new OpenAPIGenerator({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}).generate(router, {
			info: {
				title: `${config.appName} API`,
				version: "1.0.0",
			},
			servers: [
				{
					url: getBaseUrl(),
					description: "API server",
				},
			],
		});

		const mergedSchema = mergeOpenApiSchemas({
			authSchema: authSchema as any,
			appSchema: appSchema as any,
		});

		return c.json(mergedSchema);
	})
	.get("/orpc-openapi", async (c) => {
		const denied = await requireOpenApiAccess(c);
		if (denied) {
			return denied;
		}
		const appSchema = await new OpenAPIGenerator({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}).generate(router, {
			info: {
				title: `${config.appName} API`,
				version: "1.0.0",
			},
		});

		return c.json(appSchema);
	})
	// Scalar API reference based on OpenAPI schema (gated in production)
	.get("/docs", async (c, next) => {
		const denied = await requireOpenApiAccess(c);
		if (denied) {
			return denied;
		}
		const handler = Scalar({
			theme: "saturn",
			url: "/api/openapi",
		});
		return handler(c, next);
	})
	// Payments webhook handler
	.post("/webhooks/payments", (c) => paymentsWebhookHandler(c.req.raw))
	// LiveKit egress / room webhook handler
	.post("/webhooks/livekit", (c) => livekitWebhookHandler(c.req.raw))
	// Campaign workflow webhook trigger (HMAC optional but enforced when secret set)
	.post("/workflows/hooks/:token", async (c) => {
		const token = c.req.param("token");
		const rawText = await c.req.text();
		let body: unknown = {};
		try {
			body = rawText ? JSON.parse(rawText) : {};
		} catch {
			body = rawText ? { raw: rawText } : {};
		}
		const headers: Record<string, string> = {};
		c.req.raw.headers.forEach((v, k) => {
			headers[k] = v;
		});

		const { startWebhookRun, getWorkflowWebhookSecret } = await import(
			"./modules/workflows/procedures"
		);
		const webhookSecret = await getWorkflowWebhookSecret(token);
		if (webhookSecret) {
			const verified = verifyWebhookHmac({
				rawBody: rawText,
				signatureHeader:
					c.req.header("x-webhook-signature") ??
					c.req.header("X-Webhook-Signature") ??
					null,
				timestampHeader:
					c.req.header("x-webhook-timestamp") ??
					c.req.header("X-Webhook-Timestamp") ??
					null,
				secret: webhookSecret,
			});
			if (!verified.ok) {
				return c.json(
					{ ok: false, error: "Invalid webhook signature" },
					401,
				);
			}
		}

		try {
			const run = await startWebhookRun(token, {
				body,
				headers,
				query: c.req.query(),
			});
			return c.json({ ok: true, runId: run?.id, status: run?.status });
		} catch (err) {
			return c.json(
				{
					ok: false,
					error: err instanceof Error ? err.message : String(err),
				},
				400,
			);
		}
	})
	// Health check
	.get("/health", (c) => c.text("OK"))
	// oRPC handlers (for RPC and OpenAPI)
	.use("*", async (c, next) => {
		const context = {
			headers: c.req.raw.headers,
		};

		const isRpc = c.req.path.includes("/rpc/");

		const handler = isRpc ? rpcHandler : openApiHandler;

		// RPC paths are matched relative to `/api/rpc`.
		// OpenAPI routes already include `/api` from `router.prefix("/api")`,
		// so do not strip that prefix again or every REST route 404s.
		const { matched, response } = await handler.handle(c.req.raw, {
			...(isRpc ? { prefix: "/api/rpc" } : {}),
			context,
		});

		if (matched) {
			return c.newResponse(response.body, response);
		}

		await next();
	});

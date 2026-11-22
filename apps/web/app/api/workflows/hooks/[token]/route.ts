import {
	getWorkflowWebhookSecret,
	startWebhookRun,
} from "@repo/api/modules/workflows/procedures";
import {
	checkRateLimit,
	getClientIp,
	rateLimitResponse,
} from "@repo/api/modules/shared/rate-limit";
import { verifyWebhookHmac } from "@repo/api/modules/shared/signed-token";
import { NextResponse } from "next/server";

export async function POST(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	const ip = getClientIp(request.headers);
	const rate = checkRateLimit(`wf-hook:${ip}`, {
		limit: 30,
		windowMs: 60_000,
	});
	if (!rate.ok) {
		return rateLimitResponse(rate);
	}

	const { token } = await context.params;
	const rawText = await request.text();
	let body: unknown = {};
	try {
		body = rawText ? JSON.parse(rawText) : {};
	} catch {
		body = rawText ? { raw: rawText } : {};
	}

	const headers: Record<string, string> = {};
	request.headers.forEach((v, k) => {
		headers[k] = v;
	});
	const url = new URL(request.url);
	const query: Record<string, string> = {};
	url.searchParams.forEach((v, k) => {
		query[k] = v;
	});

	const webhookSecret = await getWorkflowWebhookSecret(token);
	if (webhookSecret) {
		const verified = verifyWebhookHmac({
			rawBody: rawText,
			signatureHeader:
				request.headers.get("x-webhook-signature") ??
				request.headers.get("X-Webhook-Signature"),
			timestampHeader:
				request.headers.get("x-webhook-timestamp") ??
				request.headers.get("X-Webhook-Timestamp"),
			secret: webhookSecret,
		});
		if (!verified.ok) {
			return NextResponse.json(
				{ ok: false, error: "Invalid webhook signature" },
				{ status: 401 },
			);
		}
	}

	try {
		const run = await startWebhookRun(token, { body, headers, query });
		return NextResponse.json({
			ok: true,
			runId: run?.id,
			status: run?.status,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{ ok: false, error: message },
			{ status: 400 },
		);
	}
}

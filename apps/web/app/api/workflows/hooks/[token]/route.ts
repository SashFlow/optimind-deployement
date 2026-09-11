import { startWebhookRun } from "@repo/api/modules/workflows/procedures";
import { NextResponse } from "next/server";

export async function POST(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	let body: unknown = {};
	const contentType = request.headers.get("content-type") ?? "";
	try {
		if (contentType.includes("application/json")) {
			body = await request.json();
		} else {
			const text = await request.text();
			body = text ? { raw: text } : {};
		}
	} catch {
		body = {};
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

import { resolveTemplate, resolveValue } from "../lib/template";
import type { NodeHandlerArgs, NodeHandlerResult } from "../types";

export async function handleStartWebhook(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	return {
		kind: "success",
		output: {
			body: args.context.trigger.body ?? args.context.trigger,
			headers: args.context.trigger.headers ?? {},
			query: args.context.trigger.query ?? {},
			receivedAt:
				args.context.trigger.receivedAt ?? new Date().toISOString(),
		},
	};
}

export async function handleStartScheduled(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	return {
		kind: "success",
		output: {
			scheduledAt:
				args.context.trigger.scheduledAt ?? new Date().toISOString(),
			cron: args.node.data.config.cron ?? null,
		},
	};
}

export async function handleEnd(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const summaryPath = args.node.data.config.summary as string | undefined;
	const summary = summaryPath
		? resolveValue(`{{${summaryPath}}}`, args.context)
		: args.context.nodes;
	return {
		kind: "end",
		output: { summary, finishedAt: new Date().toISOString() },
	};
}

export async function handleHttpRequest(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config;
	const method = String(
		resolveValue(cfg.method ?? "GET", args.context),
	).toUpperCase();
	const url = String(resolveTemplate(String(cfg.url ?? ""), args.context));
	if (!url) {
		throw new Error("HTTP node requires url");
	}

	const headersRaw = resolveValue(cfg.headers ?? {}, args.context);
	const headers: Record<string, string> = {};
	if (headersRaw && typeof headersRaw === "object") {
		for (const [k, v] of Object.entries(
			headersRaw as Record<string, unknown>,
		)) {
			headers[k] = String(v);
		}
	}

	const bodyVal =
		cfg.body !== undefined
			? resolveValue(cfg.body, args.context)
			: undefined;
	const timeoutMs = Number(cfg.timeoutMs ?? 30_000);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const init: RequestInit = {
			method,
			headers,
			signal: controller.signal,
		};
		if (bodyVal !== undefined && method !== "GET" && method !== "HEAD") {
			if (typeof bodyVal === "string") {
				init.body = bodyVal;
			} else {
				headers["content-type"] =
					headers["content-type"] ??
					headers["Content-Type"] ??
					"application/json";
				init.body = JSON.stringify(bodyVal);
				init.headers = headers;
			}
		}
		const res = await fetch(url, init);
		const contentType = res.headers.get("content-type") ?? "";
		let body: unknown;
		if (contentType.includes("application/json")) {
			body = await res.json();
		} else {
			body = await res.text();
		}
		const responseHeaders: Record<string, string> = {};
		res.headers.forEach((v, k) => {
			responseHeaders[k] = v;
		});
		return {
			kind: "success",
			output: {
				status: res.status,
				ok: res.ok,
				headers: responseHeaders,
				body,
			},
		};
	} finally {
		clearTimeout(timer);
	}
}

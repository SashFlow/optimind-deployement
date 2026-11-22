import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
	const value =
		process.env.IMAGE_PROXY_SIGNING_SECRET?.trim() ||
		process.env.BETTER_AUTH_SECRET?.trim() ||
		process.env.WORKER_API_KEY?.trim();
	if (!value) {
		throw new Error("No signing secret configured");
	}
	return value;
}

function b64url(input: Buffer | string): string {
	return Buffer.from(input).toString("base64url").replace(/=+$/, "");
}

function signPayload(payload: string): string {
	return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSignedToken(opts: {
	subject: string;
	expiresInSec: number;
	extra?: Record<string, string>;
}): string {
	const exp = Math.floor(Date.now() / 1000) + opts.expiresInSec;
	const body = {
		sub: opts.subject,
		exp,
		...opts.extra,
	};
	const payload = b64url(JSON.stringify(body));
	const sig = signPayload(payload);
	return `${payload}.${sig}`;
}

export function verifySignedToken(
	token: string,
	expectedSubject?: string,
):
	| { ok: true; subject: string; claims: Record<string, unknown> }
	| { ok: false; reason: string } {
	const [payload, sig] = token.split(".");
	if (!payload || !sig) {
		return { ok: false, reason: "malformed" };
	}
	const expected = signPayload(payload);
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return { ok: false, reason: "bad_signature" };
	}
	try {
		const claims = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		) as Record<string, unknown>;
		const exp = typeof claims.exp === "number" ? claims.exp : 0;
		if (exp < Math.floor(Date.now() / 1000)) {
			return { ok: false, reason: "expired" };
		}
		const subject = typeof claims.sub === "string" ? claims.sub : "";
		if (expectedSubject && subject !== expectedSubject) {
			return { ok: false, reason: "subject_mismatch" };
		}
		return { ok: true, subject, claims };
	} catch {
		return { ok: false, reason: "bad_payload" };
	}
}

/** HMAC for workflow webhooks: body + timestamp. */
export function verifyWebhookHmac(opts: {
	rawBody: string;
	signatureHeader: string | null;
	timestampHeader: string | null;
	secret: string;
	maxSkewSec?: number;
}): { ok: true } | { ok: false; reason: string } {
	if (!opts.signatureHeader || !opts.timestampHeader) {
		return { ok: false, reason: "missing_headers" };
	}
	const ts = Number(opts.timestampHeader);
	if (!Number.isFinite(ts)) {
		return { ok: false, reason: "bad_timestamp" };
	}
	const skew = opts.maxSkewSec ?? 300;
	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - ts) > skew) {
		return { ok: false, reason: "timestamp_skew" };
	}
	const payload = `${ts}.${opts.rawBody}`;
	const expected = createHmac("sha256", opts.secret)
		.update(payload)
		.digest("hex");
	const provided = opts.signatureHeader.replace(/^sha256=/i, "").trim();
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return { ok: false, reason: "bad_signature" };
	}
	return { ok: true };
}

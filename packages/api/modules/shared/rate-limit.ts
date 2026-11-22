/**
 * Lightweight in-memory rate limiter (per process).
 * Prefer Redis/WAF in multi-instance production; this blocks abuse on single hosts
 * and provides a consistent API for Next + Hono routes.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
	ok: boolean;
	remaining: number;
	retryAfterSec: number;
	limit: number;
};

export function getClientIp(headers: Headers): string {
	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0]?.trim() || "unknown";
	}
	return headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(
	key: string,
	opts: { limit: number; windowMs: number },
): RateLimitResult {
	const now = Date.now();
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
		return {
			ok: true,
			remaining: opts.limit - 1,
			retryAfterSec: Math.ceil(opts.windowMs / 1000),
			limit: opts.limit,
		};
	}

	if (existing.count >= opts.limit) {
		return {
			ok: false,
			remaining: 0,
			retryAfterSec: Math.max(
				1,
				Math.ceil((existing.resetAt - now) / 1000),
			),
			limit: opts.limit,
		};
	}

	existing.count += 1;
	return {
		ok: true,
		remaining: opts.limit - existing.count,
		retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
		limit: opts.limit,
	};
}

/** Periodic cleanup to avoid unbounded Map growth. */
setInterval(() => {
	const now = Date.now();
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) {
			buckets.delete(key);
		}
	}
}, 60_000).unref?.();

export function rateLimitResponse(result: RateLimitResult): Response {
	return new Response("Too Many Requests", {
		status: 429,
		headers: {
			"Retry-After": String(result.retryAfterSec),
			"X-RateLimit-Limit": String(result.limit),
			"X-RateLimit-Remaining": String(result.remaining),
		},
	});
}

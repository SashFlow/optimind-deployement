import {
	createSignedToken,
	verifySignedToken,
} from "@repo/api/modules/shared/signed-token";
import {
	checkRateLimit,
	getClientIp,
	rateLimitResponse,
} from "@repo/api/modules/shared/rate-limit";
import { auth } from "@repo/auth";
import { config } from "@repo/config";
import { getKnowledgeBucketName, getSignedUrl } from "@repo/storage";
import { NextResponse } from "next/server";

export const GET = async (
	req: Request,
	{ params }: { params: Promise<{ path: string[] }> },
) => {
	const ip = getClientIp(req.headers);
	const rate = checkRateLimit(`image-proxy:${ip}`, {
		limit: 60,
		windowMs: 60_000,
	});
	if (!rate.ok) {
		return rateLimitResponse(rate);
	}

	const { path } = await params;
	const [bucket, ...rest] = path;
	const filePath = rest.join("/");

	if (!(bucket && filePath)) {
		return new Response("Invalid path", { status: 400 });
	}

	const allowedBuckets = new Set(
		[
			config.storage.bucketNames.avatars,
			config.storage.bucketNames.notes,
			getKnowledgeBucketName(),
		].filter(Boolean) as string[],
	);

	if (!allowedBuckets.has(bucket)) {
		return new Response("Not found", {
			status: 404,
		});
	}

	const subject = `${bucket}/${filePath}`;
	const url = new URL(req.url);
	const token = url.searchParams.get("token");

	let authorized = false;
	if (token) {
		const verified = verifySignedToken(token, subject);
		authorized = verified.ok;
	}

	if (!authorized) {
		const session = await auth.api
			.getSession({ headers: req.headers })
			.catch(() => null);
		authorized = Boolean(session?.user);
	}

	if (!authorized) {
		return new Response("Unauthorized", { status: 401 });
	}

	const signedUrl = await getSignedUrl(filePath, {
		bucket,
		expiresIn: 60 * 60,
	});

	return NextResponse.redirect(signedUrl, {
		headers: { "Cache-Control": "max-age=3600" },
	});
};

/** Helper for callers that need a short-lived image-proxy URL. */
export function buildImageProxyUrl(bucket: string, filePath: string): string {
	const subject = `${bucket}/${filePath}`;
	const token = createSignedToken({ subject, expiresInSec: 3600 });
	return `/image-proxy/${bucket}/${filePath}?token=${encodeURIComponent(token)}`;
}

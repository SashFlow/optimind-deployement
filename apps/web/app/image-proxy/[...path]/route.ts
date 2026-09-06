import { config } from "@repo/config";
import { getSignedUrl } from "@repo/storage";
import { NextResponse } from "next/server";

export const GET = async (
	_req: Request,
	{ params }: { params: Promise<{ path: string[] }> },
) => {
	const { path } = await params;

	const [bucket, filePath] = path;

	if (!(bucket && filePath)) {
		return new Response("Invalid path", { status: 400 });
	}

	const allowedBuckets = new Set(
		[
			config.storage.bucketNames.avatars,
			config.storage.bucketNames.notes,
			process.env.S3_BUCKET_NAME?.trim(),
		].filter(Boolean) as string[],
	);

	if (!allowedBuckets.has(bucket)) {
		return new Response("Not found", {
			status: 404,
		});
	}

	const signedUrl = await getSignedUrl(filePath, {
		bucket,
		expiresIn: 60 * 60,
	});

	return NextResponse.redirect(signedUrl, {
		headers: { "Cache-Control": "max-age=3600" },
	});
};

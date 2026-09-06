import { S3Upload } from "livekit-server-sdk";

export type EgressS3Config = {
	accessKey: string;
	secret: string;
	region: string;
	bucket: string;
	endpoint?: string;
};

export function getEgressS3Config(
	env: NodeJS.ProcessEnv = process.env,
): EgressS3Config | null {
	const accessKey = env.S3_ACCESS_KEY_ID?.trim();
	const secret = env.S3_SECRET_ACCESS_KEY?.trim();
	const bucket = env.S3_BUCKET_RECORDINGS?.trim();
	const region = env.S3_REGION?.trim() || "us-east-1";
	const endpoint = env.S3_ENDPOINT_URL?.trim() || undefined;

	if (!accessKey || !secret || !bucket) {
		return null;
	}

	return { accessKey, secret, region, bucket, endpoint };
}

export function buildS3Upload(
	config?: EgressS3Config | null,
): S3Upload | undefined {
	const cfg = config === undefined ? getEgressS3Config() : config;
	if (!cfg) return undefined;

	return new S3Upload({
		accessKey: cfg.accessKey,
		secret: cfg.secret,
		region: cfg.region,
		bucket: cfg.bucket,
		endpoint: cfg.endpoint,
		forcePathStyle: Boolean(cfg.endpoint),
	});
}

export function recordingFilepath(opts: {
	organizationId: string;
	sessionId: string;
	roomName: string;
}): string {
	return `${opts.organizationId}/${opts.sessionId}/${opts.roomName}.mp4`;
}

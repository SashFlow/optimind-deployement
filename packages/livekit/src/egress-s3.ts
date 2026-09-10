import { S3Upload } from "livekit-server-sdk";

export type EgressS3Config = {
	accessKey: string;
	secret: string;
	region: string;
	bucket: string;
	endpoint?: string;
};

/**
 * LiveKit room-composite recordings land at:
 *   s3://{S3_BUCKET_RECORDINGS}/{organizationId}/{sessionId}/{roomName}.mp4
 *
 * Credential resolution (first match wins):
 *   access/secret: S3_RECORDINGS_* → S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
 *   region:        S3_RECORDINGS_REGION → S3_REGION → us-east-1
 *   endpoint:      S3_ENDPOINT_URL → S3_ENDPOINT (knowledge storage alias)
 */
export function getEgressS3Config(
	env: NodeJS.ProcessEnv = process.env,
): EgressS3Config | null {
	const accessKey =
		env.S3_RECORDINGS_ACCESS_KEY_ID?.trim() || env.S3_ACCESS_KEY_ID?.trim();
	const secret =
		env.S3_RECORDINGS_SECRET_ACCESS_KEY?.trim() ||
		env.S3_SECRET_ACCESS_KEY?.trim();
	const bucket = env.S3_BUCKET_RECORDINGS?.trim();
	const region =
		env.S3_RECORDINGS_REGION?.trim() ||
		env.S3_REGION?.trim() ||
		"us-east-1";
	const endpoint =
		env.S3_ENDPOINT_URL?.trim() || env.S3_ENDPOINT?.trim() || undefined;

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

/** Must stay in sync with voice worker `recording_filepath`. */
export function recordingFilepath(opts: {
	organizationId: string;
	sessionId: string;
	roomName: string;
}): string {
	return `${opts.organizationId}/${opts.sessionId}/${opts.roomName}.mp4`;
}

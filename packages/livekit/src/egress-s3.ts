import { S3Upload } from "livekit-server-sdk";

export type EgressS3Config = {
	accessKey: string;
	secret: string;
	region: string;
	bucket: string;
	endpoint?: string;
};

function first(
	...values: Array<string | undefined | null>
): string | undefined {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) {
			return trimmed;
		}
	}
	return undefined;
}

/**
 * LiveKit recordings land at:
 *   Composite (merged): s3://{recordingsBucket}/{organizationId}/{sessionId}/{roomName}.mp4
 *   Track roles:        s3://{recordingsBucket}/{organizationId}/{sessionId}/{roomName}/{role}
 *     role ∈ user_audio | user_video | agent_audio
 *
 * Credential resolution (first match wins) — GCS HMAC preferred:
 *   access/secret: GCP_ACCESS_KEY / GCP_SECRET_KEY → S3_RECORDINGS_* → S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
 *   region:        GCP_STORAGE_REGION → S3_RECORDINGS_REGION → S3_REGION → us-east-1
 *   endpoint:      GCP_STORAGE_URL → S3_ENDPOINT_URL → S3_ENDPOINT
 *   bucket:        GCP_BUCKET_RECORDINGS → S3_BUCKET_RECORDINGS
 *
 * GCS is used via S3 interoperability (HMAC keys + storage.googleapis.com).
 */
export function getEgressS3Config(
	env: NodeJS.ProcessEnv = process.env,
): EgressS3Config | null {
	const accessKey = first(
		env.GCP_ACCESS_KEY,
		env.S3_RECORDINGS_ACCESS_KEY_ID,
		env.S3_ACCESS_KEY_ID,
	);
	const secret = first(
		env.GCP_SECRET_KEY,
		env.S3_RECORDINGS_SECRET_ACCESS_KEY,
		env.S3_SECRET_ACCESS_KEY,
	);
	const bucket = first(env.GCP_BUCKET_RECORDINGS, env.S3_BUCKET_RECORDINGS);
	const region =
		first(
			env.GCP_STORAGE_REGION,
			env.S3_RECORDINGS_REGION,
			env.S3_REGION,
		) || "us-east-1";
	const endpoint = first(
		env.GCP_STORAGE_URL,
		env.S3_ENDPOINT_URL,
		env.S3_ENDPOINT,
	);

	if (!accessKey || !secret || !bucket) {
		return null;
	}

	return { accessKey, secret, region, bucket, endpoint };
}

export function buildS3Upload(
	config?: EgressS3Config | null,
): S3Upload | undefined {
	const cfg = config === undefined ? getEgressS3Config() : config;
	if (!cfg) {
		return undefined;
	}

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

/** Must stay in sync with voice worker `recording_track_filepath`. */
export function recordingTrackFilepath(opts: {
	organizationId: string;
	sessionId: string;
	roomName: string;
	role: string;
}): string {
	return `${opts.organizationId}/${opts.sessionId}/${opts.roomName}/${opts.role}`;
}

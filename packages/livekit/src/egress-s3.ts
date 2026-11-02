import { readFileSync } from "node:fs";
import { GCPUpload, S3Upload } from "livekit-server-sdk";

export type EgressS3Config = {
	accessKey: string;
	secret: string;
	region: string;
	bucket: string;
	endpoint?: string;
};

export type EgressStorageOutput =
	| { case: "gcp"; value: GCPUpload }
	| { case: "s3"; value: S3Upload };

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
 *   Track roles:        s3://{recordingsBucket}/{organizationId}/{sessionId}/{roomName}/{role}.{ext}
 *     role ∈ user_audio | user_video | agent_audio
 *     DirectFileOutput templates omit the extension; LiveKit appends the real
 *     container (e.g. user_video.mp4, user_audio.ogg). Resolvers must probe for
 *     that extension — the bare `{role}` key does not exist.
 *
 * LiveKit egress uploads to GCS must use GCPUpload (service-account JSON).
 * HMAC interoperability keys (GCP_ACCESS_KEY / GCP_SECRET_KEY) work for our
 * Node AWS SDK reads/signed URLs, but LiveKit's Go egress client returns
 * SignatureDoesNotMatch against storage.googleapis.com with S3Upload.
 *
 * Credential resolution for app reads (getEgressS3Config):
 *   access/secret: GCP_ACCESS_KEY / GCP_SECRET_KEY → S3_RECORDINGS_* → S3_*
 *   region/endpoint/bucket: GCP_* → S3_RECORDINGS_* → S3_*
 *
 * Credential resolution for LiveKit uploads (resolveEgressStorageOutput):
 *   1. GCP_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS / GCP_SERVICE_ACCOUNT_FILE
 *   2. Else S3Upload for non-GCS S3-compatible endpoints
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

function isGcsEgressTarget(env: NodeJS.ProcessEnv = process.env): boolean {
	if (first(env.GCP_BUCKET_RECORDINGS)) {
		return true;
	}
	const endpoint = first(
		env.GCP_STORAGE_URL,
		env.S3_ENDPOINT_URL,
		env.S3_ENDPOINT,
	);
	return Boolean(endpoint?.includes("storage.googleapis.com"));
}

/**
 * Load a GCS service-account JSON string for LiveKit GCPUpload.
 * Accepts inline JSON / base64 JSON, or a path via GOOGLE_APPLICATION_CREDENTIALS.
 */
export function loadGcpServiceAccountJson(
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	const inline = first(
		env.GCP_SERVICE_ACCOUNT_JSON,
		env.GCP_CREDENTIALS_JSON,
	);
	if (inline) {
		if (inline.startsWith("{")) {
			return inline;
		}
		try {
			const decoded = Buffer.from(inline, "base64")
				.toString("utf8")
				.trim();
			if (decoded.startsWith("{")) {
				return decoded;
			}
		} catch {
			// not base64
		}
		return inline;
	}

	const filePath = first(
		env.GOOGLE_APPLICATION_CREDENTIALS,
		env.GCP_SERVICE_ACCOUNT_FILE,
	);
	if (!filePath) {
		return null;
	}
	try {
		const contents = readFileSync(filePath, "utf8").trim();
		return contents || null;
	} catch {
		return null;
	}
}

export function buildGCPUpload(
	env: NodeJS.ProcessEnv = process.env,
): GCPUpload | undefined {
	const credentials = loadGcpServiceAccountJson(env);
	const bucket = first(env.GCP_BUCKET_RECORDINGS, env.S3_BUCKET_RECORDINGS);
	if (!credentials || !bucket) {
		return undefined;
	}
	return new GCPUpload({ credentials, bucket });
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

/**
 * Storage oneof for EncodedFileOutput / DirectFileOutput.
 * Prefers native GCS (GCPUpload); falls back to S3-compatible only when not GCS.
 */
export function resolveEgressStorageOutput(
	s3Override?: EgressS3Config | S3Upload | null,
	env: NodeJS.ProcessEnv = process.env,
): EgressStorageOutput | undefined {
	const gcp = buildGCPUpload(env);
	if (gcp) {
		return { case: "gcp", value: gcp };
	}

	if (isGcsEgressTarget(env)) {
		throw new Error(
			"LiveKit egress to GCS requires a service account JSON " +
				"(set GCP_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS). " +
				"HMAC keys (GCP_ACCESS_KEY / GCP_SECRET_KEY) work for app reads/signed URLs " +
				"but cause SignatureDoesNotMatch on LiveKit uploads.",
		);
	}

	if (s3Override instanceof S3Upload) {
		return { case: "s3", value: s3Override };
	}
	if (s3Override === null) {
		return undefined;
	}
	const s3 = buildS3Upload(s3Override ?? undefined);
	return s3 ? { case: "s3", value: s3 } : undefined;
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

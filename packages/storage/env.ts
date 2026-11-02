/**
 * Object storage env resolution.
 *
 * Prefer GCS HMAC interoperability credentials (`GCP_*`), with legacy
 * Supabase/MinIO/R2 `S3_*` vars as fallback.
 *
 * LiveKit egress and the AWS SDK both speak the S3 API, so GCS is used via
 * https://cloud.google.com/storage/docs/interoperability
 */

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

export type ObjectStorageConfig = {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
};

/** Knowledge / avatars / general object storage (HMAC + S3-compatible endpoint). */
export function getObjectStorageConfig(
	env: NodeJS.ProcessEnv = process.env,
): ObjectStorageConfig | null {
	const accessKeyId = first(env.GCP_ACCESS_KEY, env.S3_ACCESS_KEY_ID);
	const secretAccessKey = first(
		env.GCP_SECRET_KEY,
		env.S3_SECRET_ACCESS_KEY,
	);
	const endpoint = first(
		env.GCP_STORAGE_URL,
		env.S3_ENDPOINT,
		env.S3_ENDPOINT_URL,
	);
	const region =
		first(env.GCP_STORAGE_REGION, env.S3_REGION) || "auto";

	if (!accessKeyId || !secretAccessKey || !endpoint) {
		return null;
	}

	return { accessKeyId, secretAccessKey, endpoint, region };
}

/** Primary knowledge / end-user-files bucket. */
export function getKnowledgeBucketName(
	env: NodeJS.ProcessEnv = process.env,
): string | undefined {
	return first(env.GCP_STORAGE_BUCKET_NAME, env.S3_BUCKET_NAME);
}

/** LiveKit egress recordings bucket. */
export function getRecordingsBucketName(
	env: NodeJS.ProcessEnv = process.env,
): string | undefined {
	return first(env.GCP_BUCKET_RECORDINGS, env.S3_BUCKET_RECORDINGS);
}

/** Transcripts bucket (reserved; optional). */
export function getTranscriptsBucketName(
	env: NodeJS.ProcessEnv = process.env,
): string | undefined {
	return first(env.GCP_BUCKET_TRANSCRIPTS, env.S3_BUCKET_TRANSCRIPTS);
}

export type EgressStorageConfig = ObjectStorageConfig & {
	bucket: string;
};

/**
 * Credentials + bucket for LiveKit room/track egress uploads.
 * Same HMAC keys as knowledge storage unless legacy S3_RECORDINGS_* overrides.
 */
export function getEgressStorageConfig(
	env: NodeJS.ProcessEnv = process.env,
): EgressStorageConfig | null {
	const accessKeyId = first(
		env.GCP_ACCESS_KEY,
		env.S3_RECORDINGS_ACCESS_KEY_ID,
		env.S3_ACCESS_KEY_ID,
	);
	const secretAccessKey = first(
		env.GCP_SECRET_KEY,
		env.S3_RECORDINGS_SECRET_ACCESS_KEY,
		env.S3_SECRET_ACCESS_KEY,
	);
	const bucket = getRecordingsBucketName(env);
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

	if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
		return null;
	}

	return {
		accessKeyId,
		secretAccessKey,
		bucket,
		region,
		endpoint,
	};
}

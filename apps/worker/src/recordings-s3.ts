import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, extname } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { type EgressS3Config, getEgressS3Config } from "@repo/livekit";

/** LiveKit track egress appends the container ext when filepath has none. */
const TRACK_KEY_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mkv", ".m4a"] as const;

let client: S3Client | null = null;
let config: EgressS3Config | null = null;

export function getRecordingsS3Config(): EgressS3Config {
	const cfg = getEgressS3Config();
	if (!cfg) {
		throw new Error(
			"Recordings S3 is not configured (need S3_BUCKET_RECORDINGS + credentials)",
		);
	}
	return cfg;
}

export function getRecordingsS3Client(): {
	client: S3Client;
	config: EgressS3Config;
} {
	if (!client || !config) {
		config = getRecordingsS3Config();
		// GCS HMAC rejects AWS SDK v3 default CRC32 flexible checksums on
		// PutObject (SignatureDoesNotMatch / "Invalid argument.").
		client = new S3Client({
			region: config.region,
			endpoint: config.endpoint,
			forcePathStyle: Boolean(config.endpoint),
			credentials: {
				accessKeyId: config.accessKey,
				secretAccessKey: config.secret,
			},
			requestChecksumCalculation: "WHEN_REQUIRED",
			responseChecksumValidation: "WHEN_REQUIRED",
		});
	}
	return { client, config };
}

function stripBucketPrefix(key: string, bucket: string): string {
	const trimmed = key.replace(/^\/+/, "");
	if (trimmed.startsWith(`${bucket}/`)) {
		return trimmed.slice(bucket.length + 1);
	}
	return trimmed;
}

function keyFromCandidate(value: string, bucket: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith("s3://")) {
		const withoutScheme = trimmed.slice("s3://".length);
		const slash = withoutScheme.indexOf("/");
		if (slash === -1) {
			return null;
		}
		const key = withoutScheme.slice(slash + 1);
		return key ? stripBucketPrefix(key, bucket) : null;
	}

	try {
		const url = new URL(trimmed);
		const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
		return path ? stripBucketPrefix(path, bucket) : null;
	} catch {
		if (!trimmed.includes("://")) {
			return stripBucketPrefix(trimmed, bucket);
		}
	}

	return null;
}

function hasFileExtension(key: string): boolean {
	const base = key.split("/").pop() ?? key;
	const ext = extname(base);
	return Boolean(ext && ext.length <= 8);
}

/**
 * Resolve an object key from a job file URL / destination filepath.
 * Prefers LiveKit-reported URLs (they include the real container extension)
 * over the provisional destination filepath template.
 */
export function resolveObjectKey(
	opts: {
		fileUrl?: string | null;
		outputUrls?: string[] | null;
		filepath?: string | null;
	},
	bucket: string,
): string | null {
	const candidates = [opts.fileUrl, ...(opts.outputUrls ?? [])].filter(
		(v): v is string => Boolean(v?.trim()),
	);

	let fallback: string | null = null;
	for (const raw of candidates) {
		const key = keyFromCandidate(raw, bucket);
		if (!key) {
			continue;
		}
		if (hasFileExtension(key)) {
			return key;
		}
		fallback ??= key;
	}

	const filepath = opts.filepath?.trim();
	if (filepath) {
		const key = stripBucketPrefix(filepath, bucket);
		if (hasFileExtension(key)) {
			return key;
		}
		fallback ??= key;
	}

	return fallback;
}

async function objectExists(key: string): Promise<boolean> {
	const { client, config } = getRecordingsS3Client();
	try {
		await client.send(
			new HeadObjectCommand({
				Bucket: config.bucket,
				Key: key,
			}),
		);
		return true;
	} catch (error) {
		const name =
			error && typeof error === "object" && "name" in error
				? String((error as { name?: unknown }).name)
				: "";
		const status =
			error &&
			typeof error === "object" &&
			"$metadata" in error &&
			typeof (error as { $metadata?: { httpStatusCode?: unknown } })
				.$metadata?.httpStatusCode === "number"
				? (error as { $metadata: { httpStatusCode: number } }).$metadata
						.httpStatusCode
				: undefined;
		if (name === "NotFound" || name === "NoSuchKey" || status === 404) {
			return false;
		}
		throw error;
	}
}

/**
 * LiveKit may write `…/user_video.mp4` even when we requested `…/user_video`.
 * Resolve the key that actually exists before downloading.
 */
export async function resolveExistingObjectKey(
	key: string,
): Promise<string | null> {
	if (await objectExists(key)) {
		return key;
	}
	if (hasFileExtension(key)) {
		return null;
	}
	for (const ext of TRACK_KEY_EXTENSIONS) {
		const candidate = `${key}${ext}`;
		if (await objectExists(candidate)) {
			return candidate;
		}
	}
	return null;
}

export async function downloadObjectToFile(
	key: string,
	destPath: string,
): Promise<string> {
	const { client, config } = getRecordingsS3Client();
	await mkdir(dirname(destPath), { recursive: true });

	const resolvedKey = (await resolveExistingObjectKey(key)) ?? key;

	const response = await client.send(
		new GetObjectCommand({
			Bucket: config.bucket,
			Key: resolvedKey,
		}),
	);

	if (!response.Body) {
		throw new Error(`Empty S3 body for key ${resolvedKey}`);
	}

	await pipeline(response.Body as Readable, createWriteStream(destPath));
	return resolvedKey;
}

export async function uploadFileToObject(
	key: string,
	filePath: string,
	contentType: string,
): Promise<{ sizeBytes: number }> {
	const { client, config } = getRecordingsS3Client();
	const { createReadStream } = await import("node:fs");
	const info = await stat(filePath);

	await client.send(
		new PutObjectCommand({
			Bucket: config.bucket,
			Key: key,
			Body: createReadStream(filePath),
			ContentType: contentType,
			ContentLength: info.size,
		}),
	);

	return { sizeBytes: info.size };
}

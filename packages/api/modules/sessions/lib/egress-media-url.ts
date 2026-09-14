import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEgressS3Config } from "@repo/livekit";
import { logger } from "@repo/logs";

const PLAYABLE_URL_EXPIRES_IN = 60 * 60;

type EgressDestination = {
	bucket?: string;
	filepath?: string;
	endpoint?: string | null;
	region?: string;
};

type EgressJobMediaSource = {
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	destination?: unknown;
	metadata?: unknown;
};

function isHttpUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

function parseS3Url(url: string): { bucket: string; key: string } | null {
	const match = /^s3:\/\/([^/]+)\/(.+)$/i.exec(url.trim());
	if (!match) {
		return null;
	}
	return { bucket: match[1], key: match[2] };
}

function readDestination(value: unknown): EgressDestination | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const dest = value as EgressDestination;
	return {
		bucket: typeof dest.bucket === "string" ? dest.bucket : undefined,
		filepath: typeof dest.filepath === "string" ? dest.filepath : undefined,
		endpoint:
			typeof dest.endpoint === "string"
				? dest.endpoint
				: dest.endpoint === null
					? null
					: undefined,
		region: typeof dest.region === "string" ? dest.region : undefined,
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function extensionOf(path: string): string {
	const withoutQuery = path.split("?")[0]?.split("#")[0] ?? path;
	const base = withoutQuery.split("/").pop() ?? withoutQuery;
	const dot = base.lastIndexOf(".");
	if (dot < 0) {
		return "";
	}
	return base.slice(dot + 1).toLowerCase();
}

/** Whether this egress recording is audio-only (phone/SIP or explicit flag). */
export function isEgressAudioOnly(job: EgressJobMediaSource): boolean {
	const meta = asRecord(job.metadata);
	if (typeof meta?.audioOnly === "boolean") {
		return meta.audioOnly;
	}
	if (meta?.audioOnly === "true") {
		return true;
	}
	if (meta?.audioOnly === "false") {
		return false;
	}
	return false;
}

export function inferEgressContentType(
	job: EgressJobMediaSource,
	key?: string | null,
): string {
	const audioOnly = isEgressAudioOnly(job);
	const path =
		key ||
		readDestination(job.destination)?.filepath ||
		job.fileUrl ||
		job.outputUrls?.[0] ||
		"";
	const ext = extensionOf(path);

	if (audioOnly) {
		if (ext === "ogg") {
			return "audio/ogg";
		}
		if (ext === "mp3") {
			return "audio/mpeg";
		}
		if (ext === "wav") {
			return "audio/wav";
		}
		if (ext === "m4a" || ext === "aac") {
			return "audio/mp4";
		}
		return "audio/mp4";
	}

	switch (ext) {
		case "mp3":
			return "audio/mpeg";
		case "wav":
			return "audio/wav";
		case "ogg":
			return "audio/ogg";
		case "m4a":
		case "aac":
			return "audio/mp4";
		case "webm":
			return "video/webm";
		default:
			return "video/mp4";
	}
}

function resolveObjectRef(
	job: EgressJobMediaSource,
): { bucket: string; key: string } | null {
	const destination = readDestination(job.destination);
	if (destination?.filepath) {
		const cfg = getEgressS3Config();
		const bucket = destination.bucket || cfg?.bucket;
		if (bucket) {
			return { bucket, key: destination.filepath };
		}
	}

	const candidates = [job.fileUrl, ...(job.outputUrls ?? [])].filter(
		(url): url is string => Boolean(url),
	);

	for (const candidate of candidates) {
		const parsed = parseS3Url(candidate);
		if (parsed) {
			return parsed;
		}
	}

	// Last resort: try to parse key from an http(s) URL path for re-signing.
	for (const candidate of candidates) {
		if (!isHttpUrl(candidate)) {
			continue;
		}
		try {
			const url = new URL(candidate);
			const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
			const cfg = getEgressS3Config();
			if (cfg?.bucket && key) {
				// Path-style: /bucket/key...
				if (key.startsWith(`${cfg.bucket}/`)) {
					return {
						bucket: cfg.bucket,
						key: key.slice(cfg.bucket.length + 1),
					};
				}
				return { bucket: cfg.bucket, key };
			}
		} catch {
			// ignore
		}
	}

	return null;
}

function createRecordingsS3Client() {
	const cfg = getEgressS3Config();
	if (!cfg) {
		return null;
	}

	return new S3Client({
		region: cfg.region,
		endpoint: cfg.endpoint,
		forcePathStyle: Boolean(cfg.endpoint),
		credentials: {
			accessKeyId: cfg.accessKey,
			secretAccessKey: cfg.secret,
		},
	});
}

/**
 * Prefer a freshly signed recordings-bucket URL with an explicit browser MIME
 * type. Falls back to a stored http(s) URL only when signing is unavailable.
 */
export async function resolveEgressPlayableUrl(
	job: EgressJobMediaSource,
): Promise<string | null> {
	const objectRef = resolveObjectRef(job);
	const client = objectRef ? createRecordingsS3Client() : null;

	if (objectRef && client) {
		const contentType = inferEgressContentType(job, objectRef.key);
		try {
			return await getS3SignedUrl(
				client,
				new GetObjectCommand({
					Bucket: objectRef.bucket,
					Key: objectRef.key,
					ResponseContentType: contentType,
					ResponseContentDisposition: "inline",
				}),
				{ expiresIn: PLAYABLE_URL_EXPIRES_IN },
			);
		} catch (error) {
			logger.error("Failed to sign egress recording URL", {
				bucket: objectRef.bucket,
				key: objectRef.key,
				error,
			});
		}
	}

	const candidates = [job.fileUrl, ...(job.outputUrls ?? [])].filter(
		(url): url is string => Boolean(url),
	);
	return candidates.find(isHttpUrl) ?? null;
}

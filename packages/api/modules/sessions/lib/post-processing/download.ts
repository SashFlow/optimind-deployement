import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "@repo/config";
import { getEgressS3Config } from "@repo/livekit";
import { getSignedUrl } from "@repo/storage";
import {
	inferEgressContentType,
	isEgressAudioOnly,
	resolveEgressObjectRef,
	resolveEgressPlayableUrl,
} from "../egress-media-url";
import type { MediaPart } from "./types";

const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

async function streamToBuffer(body: unknown): Promise<Buffer> {
	if (!body) {
		return Buffer.alloc(0);
	}
	if (Buffer.isBuffer(body)) {
		return body;
	}
	if (body instanceof Uint8Array) {
		return Buffer.from(body);
	}
	if (typeof Blob !== "undefined" && body instanceof Blob) {
		return Buffer.from(await body.arrayBuffer());
	}
	const chunks: Buffer[] = [];
	for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

/** Download an end-user SessionFile from object storage. */
export async function downloadEndUserFile(storageKey: string): Promise<Buffer> {
	const bucket = config.storage.bucketNames.endUserFiles;
	const signed = await getSignedUrl(storageKey, {
		bucket,
		expiresIn: 5 * 60,
	});
	const response = await fetch(signed);
	if (!response.ok) {
		throw new Error(
			`Failed to download session file (${response.status}): ${storageKey}`,
		);
	}
	return Buffer.from(await response.arrayBuffer());
}

type EgressJobLike = {
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	destination?: unknown;
	metadata?: unknown;
	status?: string;
	sizeBytes?: number | null;
	type?: string;
};

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
 * Best-effort download of a playable room recording for body assessment.
 * Skips audio-only / oversized / incomplete egress.
 */
export async function downloadSessionRecording(
	jobs: EgressJobLike[],
): Promise<MediaPart | null> {
	const candidate = jobs.find(
		(job) =>
			job.status === "COMPLETE" &&
			!isEgressAudioOnly(job) &&
			(job.sizeBytes == null || job.sizeBytes <= MAX_VIDEO_BYTES),
	);
	if (!candidate) {
		return null;
	}
	if (
		typeof candidate.sizeBytes === "number" &&
		candidate.sizeBytes > MAX_VIDEO_BYTES
	) {
		return null;
	}

	const objectRef = await resolveEgressObjectRef(candidate);
	const client = objectRef ? createRecordingsS3Client() : null;
	if (objectRef && client) {
		try {
			const response = await client.send(
				new GetObjectCommand({
					Bucket: objectRef.bucket,
					Key: objectRef.key,
				}),
			);
			const bytes = await streamToBuffer(response.Body);
			if (bytes.byteLength > 0 && bytes.byteLength <= MAX_VIDEO_BYTES) {
				return {
					mimeType: inferEgressContentType(candidate, objectRef.key),
					bytes,
				};
			}
		} catch {
			// Fall through to signed URL fetch.
		}
	}

	const mimeType = inferEgressContentType(
		candidate,
		objectRef?.key ?? undefined,
	);
	const url = await resolveEgressPlayableUrl(candidate);
	if (!url) {
		return null;
	}
	const response = await fetch(url);
	if (!response.ok) {
		return null;
	}
	const bytes = Buffer.from(await response.arrayBuffer());
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_VIDEO_BYTES) {
		return null;
	}
	return { mimeType, bytes };
}

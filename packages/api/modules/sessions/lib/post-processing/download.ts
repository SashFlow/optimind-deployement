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
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

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

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function trackRole(job: EgressJobLike): string | null {
	const role = asRecord(job.metadata).role;
	return typeof role === "string" ? role : null;
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

/** Prefer merged room video, then user_video track, over any other non-audio egress. */
function scoreVideoEgressJob(job: EgressJobLike): number {
	if (job.status !== "COMPLETE" || isEgressAudioOnly(job)) {
		return -1;
	}
	if (typeof job.sizeBytes === "number" && job.sizeBytes > MAX_VIDEO_BYTES) {
		return -1;
	}
	const meta = asRecord(job.metadata);
	const role = typeof meta.role === "string" ? meta.role : null;
	const source = typeof meta.source === "string" ? meta.source : null;
	if (source === "track_merge") {
		return 100;
	}
	if (job.type === "ROOM_COMPOSITE") {
		return 90;
	}
	if (role === "user_video") {
		return 80;
	}
	if (job.type === "PARTICIPANT") {
		return 50;
	}
	return 10;
}

async function downloadEgressJobBytes(
	job: EgressJobLike,
	maxBytes: number,
): Promise<MediaPart | null> {
	if (typeof job.sizeBytes === "number" && job.sizeBytes > maxBytes) {
		return null;
	}

	const objectRef = await resolveEgressObjectRef(job);
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
			if (bytes.byteLength > 0 && bytes.byteLength <= maxBytes) {
				return {
					mimeType: inferEgressContentType(job, objectRef.key),
					bytes,
				};
			}
		} catch {
			// Fall through to signed URL fetch.
		}
	}

	const mimeType = inferEgressContentType(job, objectRef?.key ?? undefined);
	const url = await resolveEgressPlayableUrl(job);
	if (!url) {
		return null;
	}
	const response = await fetch(url);
	if (!response.ok) {
		return null;
	}
	const bytes = Buffer.from(await response.arrayBuffer());
	if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
		return null;
	}
	return { mimeType, bytes };
}

/**
 * Best-effort download of a playable room recording for body assessment.
 * Skips audio-only / oversized / incomplete egress.
 */
export async function downloadSessionRecording(
	jobs: EgressJobLike[],
): Promise<MediaPart | null> {
	const candidate = [...jobs]
		.map((job) => ({ job, score: scoreVideoEgressJob(job) }))
		.filter((row) => row.score >= 0)
		.sort((a, b) => b.score - a.score)[0]?.job;
	if (!candidate) {
		return null;
	}
	return downloadEgressJobBytes(candidate, MAX_VIDEO_BYTES);
}

export type SessionMediaTracks = {
	userVideo: MediaPart | null;
	userAudio: MediaPart | null;
	agentAudio: MediaPart | null;
};

function pickCompleteRole(
	jobs: EgressJobLike[],
	role: string,
): EgressJobLike | null {
	return (
		jobs.find(
			(job) => job.status === "COMPLETE" && trackRole(job) === role,
		) ?? null
	);
}

/**
 * Download per-track egress media for Gemini media-integrity analysis.
 * Prefers explicit track roles; falls back to best non-audio video for userVideo.
 */
export async function downloadSessionMediaTracks(
	jobs: EgressJobLike[],
): Promise<SessionMediaTracks> {
	const userVideoJob =
		pickCompleteRole(jobs, "user_video") ??
		[...jobs]
			.map((job) => ({ job, score: scoreVideoEgressJob(job) }))
			.filter((row) => row.score >= 0)
			.sort((a, b) => b.score - a.score)[0]?.job ??
		null;
	const userAudioJob = pickCompleteRole(jobs, "user_audio");
	const agentAudioJob = pickCompleteRole(jobs, "agent_audio");

	const [userVideo, userAudio, agentAudio] = await Promise.all([
		userVideoJob
			? downloadEgressJobBytes(userVideoJob, MAX_VIDEO_BYTES)
			: Promise.resolve(null),
		userAudioJob
			? downloadEgressJobBytes(userAudioJob, MAX_AUDIO_BYTES)
			: Promise.resolve(null),
		agentAudioJob
			? downloadEgressJobBytes(agentAudioJob, MAX_AUDIO_BYTES)
			: Promise.resolve(null),
	]);

	return { userVideo, userAudio, agentAudio };
}

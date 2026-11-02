import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { ORPCError } from "@orpc/client";
import { config } from "@repo/config";
import { getKnowledgeBucketName, getObjectStorageConfig } from "@repo/storage";

let s3Client: S3Client | null = null;

/** Knowledge uploads use GCP_STORAGE_BUCKET_NAME / S3_BUCKET_NAME. */
export function getKnowledgeBucket() {
	return getKnowledgeBucketName() || config.storage.bucketNames.notes;
}

export function getKnowledgeS3Client() {
	if (s3Client) {
		return s3Client;
	}
	const storage = getObjectStorageConfig();
	if (!storage) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Object storage is not configured",
		});
	}
	s3Client = new S3Client({
		region: storage.region,
		endpoint: storage.endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: storage.accessKeyId,
			secretAccessKey: storage.secretAccessKey,
		},
	});
	return s3Client;
}

export async function createKnowledgeSignedUploadUrl(input: {
	bucket: string;
	key: string;
	contentType: string;
}) {
	return getS3SignedUrl(
		getKnowledgeS3Client(),
		new PutObjectCommand({
			Bucket: input.bucket,
			Key: input.key,
			ContentType: input.contentType,
		}),
		{ expiresIn: 60 },
	);
}

async function streamToBuffer(
	body:
		| ReadableStream
		| NodeJS.ReadableStream
		| Blob
		| Uint8Array
		| undefined,
): Promise<Buffer> {
	if (!body) {
		return Buffer.alloc(0);
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

export async function downloadKnowledgeObject(input: {
	bucket: string;
	key: string;
}): Promise<Buffer> {
	const response = await getKnowledgeS3Client().send(
		new GetObjectCommand({
			Bucket: input.bucket,
			Key: input.key,
		}),
	);
	return streamToBuffer(response.Body as never);
}

import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@repo/logs";
import { getObjectStorageConfig } from "../../env";
import type {
	GetSignedUploadUrlHandler,
	GetSignedUrlHander,
	UploadObjectHandler,
} from "../../types";

let s3Client: S3Client | null = null;

export const getS3Client = () => {
	if (s3Client) {
		return s3Client;
	}

	const config = getObjectStorageConfig();
	if (!config) {
		throw new Error(
			"Missing object storage config (set GCP_ACCESS_KEY / GCP_SECRET_KEY / GCP_STORAGE_URL, or legacy S3_* vars)",
		);
	}

	s3Client = new S3Client({
		region: config.region,
		endpoint: config.endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});

	return s3Client;
};

export const getSignedUploadUrl: GetSignedUploadUrlHandler = async (
	path,
	{ bucket },
) => {
	const client = getS3Client();
	try {
		return await getS3SignedUrl(
			client,
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				ContentType: "image/jpeg",
			}),
			{
				expiresIn: 60,
			},
		);
	} catch (e) {
		logger.error(e);

		throw new Error("Could not get signed upload url");
	}
};

export const getSignedUrl: GetSignedUrlHander = async (
	path,
	{ bucket, expiresIn },
) => {
	const client = getS3Client();
	try {
		return getS3SignedUrl(
			client,
			new GetObjectCommand({ Bucket: bucket, Key: path }),
			{ expiresIn },
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not get signed url");
	}
};

export const uploadObject: UploadObjectHandler = async (
	path,
	body,
	{ bucket, contentType },
) => {
	const client = getS3Client();
	try {
		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				Body: body,
				ContentType: contentType || "application/octet-stream",
			}),
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not upload object");
	}
};

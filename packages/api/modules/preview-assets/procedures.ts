import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { ORPCError } from "@orpc/client";
import { config } from "@repo/config";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { requireOrgMembership } from "../shared/require-org-membership";

let s3Client: S3Client | null = null;

function getS3Client() {
	if (s3Client) return s3Client;
	const endpoint = process.env.S3_ENDPOINT;
	const accessKeyId = process.env.S3_ACCESS_KEY_ID;
	const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
	if (!endpoint || !accessKeyId || !secretAccessKey) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Object storage is not configured",
		});
	}
	s3Client = new S3Client({
		region: process.env.S3_REGION || "auto",
		endpoint,
		forcePathStyle: true,
		credentials: { accessKeyId, secretAccessKey },
	});
	return s3Client;
}

export const createUploadUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/preview-assets/upload-url",
		tags: ["PreviewAssets"],
		summary: "Create signed upload URL for preview assets",
	})
	.input(
		z.object({
			organizationId: z.string(),
			fileName: z.string().min(1),
			contentType: z.string().min(1),
		}),
	)
	.handler(async ({ input, context }) => {
		await requireOrgMembership(input.organizationId, context.user.id);

		const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
		const path = `preview/${input.organizationId}/${nanoid()}-${safeName}`;
		const bucket = config.storage.bucketNames.notes;

		const signedUploadUrl = await getS3SignedUrl(
			getS3Client(),
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				ContentType: input.contentType,
			}),
			{ expiresIn: 60 },
		);

		return {
			signedUploadUrl,
			path,
			bucket,
			url: `/image-proxy/${bucket}/${path}`,
		};
	});

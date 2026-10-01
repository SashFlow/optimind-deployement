import { config } from "@repo/config";
import { createSessionFile } from "@repo/database";
import { getSignedUrl, uploadObject } from "@repo/storage";
import { nanoid } from "nanoid";

export const MAX_END_USER_FILE_BYTES = 25 * 1024 * 1024;

const bucket = () => config.storage.bucketNames.endUserFiles;

function safeFileName(name: string) {
	const cleaned = name
		.replace(/[/\\]/g, "_")
		.replace(/[^\w.\- ]+/g, "")
		.trim();
	return cleaned.slice(-120) || "file";
}

/** Store a worker-provided file in S3 and record it for the session's end user. */
export async function uploadEndUserFile(args: {
	session: { id: string; organizationId: string; endUserId: string };
	file: File;
	name?: string;
}) {
	const name = safeFileName(args.name || args.file.name);
	const type = args.file.type || "application/octet-stream";
	const key = [
		"end-users",
		args.session.organizationId,
		args.session.endUserId,
		args.session.id,
		`${nanoid(10)}-${name}`,
	].join("/");

	await uploadObject(key, new Uint8Array(await args.file.arrayBuffer()), {
		bucket: bucket(),
		contentType: type,
	});

	return createSessionFile({
		organizationId: args.session.organizationId,
		sessionId: args.session.id,
		endUserId: args.session.endUserId,
		name,
		storageKey: key,
		type,
		size: args.file.size,
	});
}

/** Replace stored keys with short-lived download URLs for the dashboard. */
export async function withSignedFileUrls<T extends { url: string }>(
	files: T[],
): Promise<Array<T & { downloadUrl: string | null }>> {
	return Promise.all(
		files.map(async (file) => ({
			...file,
			downloadUrl: await getSignedUrl(file.url, {
				bucket: bucket(),
				expiresIn: 60 * 60,
			}).catch(() => null),
		})),
	);
}

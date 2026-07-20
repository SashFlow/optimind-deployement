import type {
	BrowserBreadcrumb,
	BrowserFileEntry,
	BrowserListResponse,
} from "../types/browser";

const bucketName = process.env.S3_BUCKET_NAME?.trim() ?? "";
const rootPrefix = normalizePrefix(process.env.S3_BROWSER_PREFIX ?? "");

type S3ClientInstance = import("@aws-sdk/client-s3").S3Client;

let s3Client: S3ClientInstance | null = null;

async function getS3Client() {
	if (s3Client) {
		return s3Client;
	}

	const { S3Client } = await import("@aws-sdk/client-s3");

	const s3Endpoint = process.env.S3_ENDPOINT as string | undefined;
	const s3Region = (process.env.S3_REGION as string) || "auto";
	const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID as string | undefined;
	const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY as
		| string
		| undefined;

	if (!s3AccessKeyId) {
		throw new Error("S3_ACCESS_KEY_ID is not configured");
	}

	if (!s3SecretAccessKey) {
		throw new Error("S3_SECRET_ACCESS_KEY is not configured");
	}

	s3Client = new S3Client({
		region: s3Region,
		...(s3Endpoint
			? {
					endpoint: s3Endpoint,
					forcePathStyle: true,
				}
			: {}),
		credentials: {
			accessKeyId: s3AccessKeyId,
			secretAccessKey: s3SecretAccessKey,
		},
	});

	return s3Client;
}

function assertBucketConfigured() {
	if (!bucketName) {
		throw new Error("S3_BUCKET_NAME is not configured");
	}
}

function normalizeSegments(input: string) {
	return input
		.replace(/\\/g, "/")
		.split("/")
		.filter(Boolean)
		.map((segment) => segment.trim())
		.map((segment) => {
			if (segment === "." || segment === "..") {
				throw new Error("Relative path traversal is not allowed");
			}

			return segment;
		});
}

function normalizePrefix(input: string) {
	const segments = normalizeSegments(input);
	if (segments.length === 0) {
		return "";
	}

	return `${segments.join("/")}/`;
}

function normalizeObjectPath(input: string) {
	return normalizeSegments(input).join("/");
}

function toActualPrefix(relativePrefix: string) {
	const normalizedPrefix = normalizePrefix(relativePrefix);
	return `${rootPrefix}${normalizedPrefix}`;
}

function toActualObjectPath(relativePath: string) {
	const normalizedPath = normalizeObjectPath(relativePath);
	return `${rootPrefix}${normalizedPath}`;
}

function toRelativePrefix(actualPrefix: string) {
	if (!actualPrefix.startsWith(rootPrefix)) {
		throw new Error(
			"Requested prefix is outside the configured browser root",
		);
	}

	return normalizePrefix(actualPrefix.slice(rootPrefix.length));
}

function toRelativePath(actualPath: string) {
	if (!actualPath.startsWith(rootPrefix)) {
		throw new Error(
			"Requested object is outside the configured browser root",
		);
	}

	return normalizeObjectPath(actualPath.slice(rootPrefix.length));
}

function getDisplayName(value: string) {
	const normalizedValue = value.endsWith("/") ? value.slice(0, -1) : value;
	const segments = normalizedValue.split("/").filter(Boolean);
	return segments.at(-1) ?? normalizedValue;
}

function toBreadcrumbs(relativePrefix: string): BrowserBreadcrumb[] {
	const segments = relativePrefix.split("/").filter(Boolean);

	return [
		{ label: "Root", prefix: "" },
		...segments.map((segment, index) => ({
			label: segment,
			prefix: segments.slice(0, index + 1).join("/") + "/",
		})),
	];
}

function mapFileEntry(file: {
	Key?: string;
	Size?: number;
	LastModified?: Date;
}): BrowserFileEntry {
	const key = file.Key ?? "";

	return {
		name: getDisplayName(key),
		path: toRelativePath(key),
		size: typeof file.Size === "number" ? file.Size : null,
		updatedAt: file.LastModified?.toISOString() ?? null,
		contentType: null,
	};
}

export async function listBrowserPrefix(
	relativePrefix = "",
): Promise<BrowserListResponse> {
	assertBucketConfigured();

	const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
	const currentPrefix = normalizePrefix(relativePrefix);
	const actualPrefix = toActualPrefix(currentPrefix);
	const client = await getS3Client();

	const response = await client.send(
		new ListObjectsV2Command({
			Bucket: bucketName,
			Prefix: actualPrefix,
			Delimiter: "/",
		}),
	);

	const folders = (response.CommonPrefixes ?? [])
		.map((item) => item.Prefix)
		.filter((prefix): prefix is string => Boolean(prefix))
		.map((prefix) => toRelativePrefix(prefix))
		.filter((prefix) => prefix !== currentPrefix)
		.sort((left, right) => left.localeCompare(right))
		.map((prefix) => ({
			name: getDisplayName(prefix),
			prefix,
		}));

	const listedFiles = (response.Contents ?? [])
		.filter(
			(file) =>
				Boolean(file.Key) &&
				file.Key !== actualPrefix &&
				!file.Key?.endsWith("/"),
		)
		.sort((left, right) => (left.Key ?? "").localeCompare(right.Key ?? ""))
		.map((file) => mapFileEntry(file));

	return {
		bucketName,
		rootPrefix,
		currentPrefix,
		breadcrumbs: toBreadcrumbs(currentPrefix),
		folders,
		files: listedFiles,
	};
}

export async function getDownloadUrl(relativePath: string) {
	assertBucketConfigured();

	const normalizedPath = normalizeObjectPath(relativePath);
	if (!normalizedPath) {
		throw new Error("File path is required");
	}

	const { HeadObjectCommand, GetObjectCommand } = await import(
		"@aws-sdk/client-s3"
	);
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

	const actualPath = toActualObjectPath(normalizedPath);
	const client = await getS3Client();

	try {
		await client.send(
			new HeadObjectCommand({
				Bucket: bucketName,
				Key: actualPath,
			}),
		);
	} catch {
		throw new Error("File not found");
	}

	const downloadName = getDisplayName(normalizedPath);

	return getSignedUrl(
		client,
		new GetObjectCommand({
			Bucket: bucketName,
			Key: actualPath,
			ResponseContentDisposition: `attachment; filename="${downloadName}"`,
		}),
		{ expiresIn: 15 * 60 },
	);
}

export function getBrowserConfig() {
	assertBucketConfigured();

	return {
		bucketName,
		rootPrefix,
	};
}

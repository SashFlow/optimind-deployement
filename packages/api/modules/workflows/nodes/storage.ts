import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { NodeHandlerArgs, NodeHandlerResult } from "../types";
import { resolveTemplate, resolveValue } from "../lib/template";

type StorageOp = "read" | "write" | "list" | "delete";

function getS3ClientFromConfig(cfg: Record<string, unknown>) {
	const endpoint = String(
		cfg.endpoint ?? process.env.S3_ENDPOINT ?? "",
	);
	const region = String(cfg.region ?? process.env.S3_REGION ?? "auto");
	const accessKeyId = String(
		cfg.accessKeyId ?? process.env.S3_ACCESS_KEY_ID ?? "",
	);
	const secretAccessKey = String(
		cfg.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY ?? "",
	);
	if (!accessKeyId || !secretAccessKey) {
		throw new Error("S3 credentials missing");
	}
	return new S3Client({
		region,
		...(endpoint ? { endpoint, forcePathStyle: true } : {}),
		credentials: { accessKeyId, secretAccessKey },
	});
}

async function streamToString(
	body: { transformToString?: () => Promise<string> } | undefined,
): Promise<string> {
	if (!body) return "";
	if (typeof body.transformToString === "function") {
		return body.transformToString();
	}
	return "";
}

export async function handleStorageS3(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config as Record<string, unknown>;
	const op = String(resolveValue(cfg.operation ?? "read", args.context)) as StorageOp;
	const bucket = String(
		resolveTemplate(String(cfg.bucket ?? process.env.S3_BUCKET_NAME ?? ""), args.context),
	);
	const key = String(resolveTemplate(String(cfg.key ?? cfg.path ?? ""), args.context));
	const client = getS3ClientFromConfig(cfg);

	if (op === "list") {
		const prefix = String(
			resolveTemplate(String(cfg.prefix ?? key ?? ""), args.context),
		);
		const res = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix || undefined,
				MaxKeys: Number(cfg.maxKeys ?? 100),
			}),
		);
		return {
			kind: "success",
			output: {
				operation: op,
				bucket,
				keys: (res.Contents ?? []).map((o) => ({
					key: o.Key,
					size: o.Size,
					lastModified: o.LastModified?.toISOString() ?? null,
				})),
			},
		};
	}

	if (op === "write") {
		const body = resolveValue(cfg.body ?? cfg.content ?? "", args.context);
		const content =
			typeof body === "string" ? body : JSON.stringify(body);
		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: content,
				ContentType: String(cfg.contentType ?? "application/octet-stream"),
			}),
		);
		return {
			kind: "success",
			output: { operation: op, bucket, key, bytes: content.length },
		};
	}

	if (op === "delete") {
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		return { kind: "success", output: { operation: op, bucket, key, deleted: true } };
	}

	const res = await client.send(
		new GetObjectCommand({ Bucket: bucket, Key: key }),
	);
	const content = await streamToString(res.Body as { transformToString?: () => Promise<string> });
	return {
		kind: "success",
		output: {
			operation: "read",
			bucket,
			key,
			content,
			contentType: res.ContentType ?? null,
		},
	};
}

/** Azure Blob via REST (no SDK required at build time if package missing). */
export async function handleStorageAzure(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config as Record<string, unknown>;
	const op = String(resolveValue(cfg.operation ?? "read", args.context)) as StorageOp;
	const account = String(
		resolveTemplate(
			String(cfg.accountName ?? process.env.AZURE_STORAGE_ACCOUNT ?? ""),
			args.context,
		),
	);
	const container = String(
		resolveTemplate(String(cfg.container ?? ""), args.context),
	);
	const blob = String(
		resolveTemplate(String(cfg.key ?? cfg.blobName ?? ""), args.context),
	);
	const sasOrKey = String(
		cfg.sasToken ??
			cfg.accountKey ??
			process.env.AZURE_STORAGE_SAS_TOKEN ??
			process.env.AZURE_STORAGE_KEY ??
			"",
	);
	if (!account || !container) throw new Error("Azure storage requires accountName and container");

	const base = `https://${account}.blob.core.windows.net/${container}/${encodeURIComponent(blob)}`;
	const url = sasOrKey.startsWith("?")
		? `${base}${sasOrKey}`
		: sasOrKey.includes("sig=")
			? `${base}?${sasOrKey.replace(/^\?/, "")}`
			: base;

	if (op === "write") {
		const body = resolveValue(cfg.body ?? cfg.content ?? "", args.context);
		const content = typeof body === "string" ? body : JSON.stringify(body);
		const headers: Record<string, string> = {
			"x-ms-blob-type": "BlockBlob",
			"Content-Type": String(cfg.contentType ?? "application/octet-stream"),
		};
		if (sasOrKey && !sasOrKey.includes("sig=") && !sasOrKey.startsWith("?")) {
			// Account key auth is complex (SharedKey); require SAS for REST path.
			throw new Error("Azure write requires a SAS token in config.sasToken");
		}
		const res = await fetch(url, { method: "PUT", headers, body: content });
		if (!res.ok) throw new Error(`Azure write failed: ${res.status}`);
		return { kind: "success", output: { operation: op, container, blob, bytes: content.length } };
	}

	if (op === "delete") {
		const res = await fetch(url, { method: "DELETE" });
		if (!res.ok && res.status !== 404) {
			throw new Error(`Azure delete failed: ${res.status}`);
		}
		return { kind: "success", output: { operation: op, container, blob, deleted: true } };
	}

	if (op === "list") {
		const listUrl = `https://${account}.blob.core.windows.net/${container}?restype=container&comp=list${
			sasOrKey.includes("sig=") ? `&${sasOrKey.replace(/^\?/, "")}` : sasOrKey.startsWith("?") ? sasOrKey.replace("?", "&") : ""
		}`;
		const res = await fetch(listUrl);
		const text = await res.text();
		if (!res.ok) throw new Error(`Azure list failed: ${res.status}`);
		return { kind: "success", output: { operation: op, container, xml: text } };
	}

	const res = await fetch(url);
	if (!res.ok) throw new Error(`Azure read failed: ${res.status}`);
	const content = await res.text();
	return {
		kind: "success",
		output: {
			operation: "read",
			container,
			blob,
			content,
			contentType: res.headers.get("content-type"),
		},
	};
}

/** GCP Cloud Storage via JSON API with bearer token or public URL. */
export async function handleStorageGcp(
	args: NodeHandlerArgs,
): Promise<NodeHandlerResult> {
	const cfg = args.node.data.config as Record<string, unknown>;
	const op = String(resolveValue(cfg.operation ?? "read", args.context)) as StorageOp;
	const bucket = String(
		resolveTemplate(
			String(cfg.bucket ?? process.env.GCS_BUCKET ?? ""),
			args.context,
		),
	);
	const object = String(
		resolveTemplate(String(cfg.key ?? cfg.object ?? ""), args.context),
	);
	const accessToken = String(
		cfg.accessToken ?? process.env.GCP_ACCESS_TOKEN ?? "",
	);
	if (!bucket) throw new Error("GCP storage requires bucket");

	const headers: Record<string, string> = {};
	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

	if (op === "list") {
		const prefix = String(
			resolveTemplate(String(cfg.prefix ?? ""), args.context),
		);
		const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?prefix=${encodeURIComponent(prefix)}`;
		const res = await fetch(url, { headers });
		const json = await res.json();
		if (!res.ok) throw new Error(`GCS list failed: ${res.status}`);
		return { kind: "success", output: { operation: op, bucket, items: json.items ?? [] } };
	}

	if (op === "write") {
		const body = resolveValue(cfg.body ?? cfg.content ?? "", args.context);
		const content = typeof body === "string" ? body : JSON.stringify(body);
		const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(object)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": String(cfg.contentType ?? "application/octet-stream"),
			},
			body: content,
		});
		if (!res.ok) throw new Error(`GCS write failed: ${res.status}`);
		return { kind: "success", output: { operation: op, bucket, object, bytes: content.length } };
	}

	if (op === "delete") {
		const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}`;
		const res = await fetch(url, { method: "DELETE", headers });
		if (!res.ok && res.status !== 404) {
			throw new Error(`GCS delete failed: ${res.status}`);
		}
		return { kind: "success", output: { operation: op, bucket, object, deleted: true } };
	}

	const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}?alt=media`;
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`GCS read failed: ${res.status}`);
	const content = await res.text();
	return {
		kind: "success",
		output: {
			operation: "read",
			bucket,
			object,
			content,
			contentType: res.headers.get("content-type"),
		},
	};
}

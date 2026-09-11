/**
 * GCP Cloud Storage helpers used by workflow Data nodes.
 * Uses JSON API with optional bearer access token.
 */
export async function gcsRequest(params: {
	bucket: string;
	object?: string;
	accessToken?: string;
	method?: string;
	body?: string;
	contentType?: string;
	listPrefix?: string;
	operation: "read" | "write" | "list" | "delete";
}) {
	const headers: Record<string, string> = {};
	if (params.accessToken) {
		headers.Authorization = `Bearer ${params.accessToken}`;
	}
	let url = "";
	if (params.operation === "list") {
		url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(params.bucket)}/o?prefix=${encodeURIComponent(params.listPrefix ?? "")}`;
	} else if (params.operation === "write") {
		url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(params.bucket)}/o?uploadType=media&name=${encodeURIComponent(params.object ?? "")}`;
		headers["Content-Type"] =
			params.contentType ?? "application/octet-stream";
	} else if (params.operation === "delete") {
		url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(params.bucket)}/o/${encodeURIComponent(params.object ?? "")}`;
	} else {
		url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(params.bucket)}/o/${encodeURIComponent(params.object ?? "")}?alt=media`;
	}
	const res = await fetch(url, {
		method:
			params.method ??
			(params.operation === "write"
				? "POST"
				: params.operation === "delete"
					? "DELETE"
					: "GET"),
		headers,
		body: params.body,
	});
	const text = await res.text();
	return {
		ok: res.ok,
		status: res.status,
		text,
		contentType: res.headers.get("content-type"),
	};
}

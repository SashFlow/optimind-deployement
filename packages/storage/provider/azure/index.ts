/**
 * Azure Blob storage helpers used by workflow Data nodes.
 * Prefer SAS tokens for REST access.
 */
export async function azureBlobRequest(params: {
	accountName: string;
	container: string;
	blob?: string;
	sasToken?: string;
	method?: string;
	body?: string;
	headers?: Record<string, string>;
	list?: boolean;
}) {
	const { accountName, container, blob = "", sasToken = "" } = params;
	const base = params.list
		? `https://${accountName}.blob.core.windows.net/${container}?restype=container&comp=list`
		: `https://${accountName}.blob.core.windows.net/${container}/${encodeURIComponent(blob)}`;
	const url = sasToken
		? `${base}${base.includes("?") ? "&" : "?"}${sasToken.replace(/^\?/, "")}`
		: base;
	const res = await fetch(url, {
		method: params.method ?? "GET",
		headers: params.headers,
		body: params.body,
	});
	const text = await res.text();
	return { ok: res.ok, status: res.status, text, contentType: res.headers.get("content-type") };
}

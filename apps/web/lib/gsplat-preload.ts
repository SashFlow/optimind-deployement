/**
 * Prefetch and cache 3DGS (arkit) avatar zips for the preview session window.
 *
 * `@myned-ai/gsplat-flame-avatar-renderer` always `fetch()`es `/gsplat/{id}.zip`
 * then calls `arrayBuffer()`. We install a page-level fetch interceptor so
 * lobby prefetch and Join share one in-memory (and Cache API) copy of the
 * ~4 MB zip, and we preload the renderer module so the dynamic import is warm.
 */

import { getGsplatAvatarZipUrl } from "@/lib/stock-avatars";

type GsplatRendererModule =
	typeof import("@myned-ai/gsplat-flame-avatar-renderer");

const GSPLAT_ZIP_CACHE_NAME = "optimind-gsplat-avatar-zip-v1";

let rendererPromise: Promise<GsplatRendererModule> | null = null;
let zipFetchInstalled = false;
/** Native fetch captured before we patch window.fetch. */
let nativeFetch: typeof fetch | null = null;

/** In-memory bytes keyed by absolute zip URL. */
const zipBytesByUrl = new Map<string, ArrayBuffer>();
/** Coalesce concurrent downloads for the same URL. */
const zipInflightByUrl = new Map<string, Promise<ArrayBuffer>>();

function resolveRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	return input.url;
}

/** Normalize to an absolute same-origin URL for cache keys. */
export function resolveGsplatZipAbsoluteUrl(zipUrl: string): string {
	if (typeof window === "undefined") {
		return zipUrl;
	}
	try {
		return new URL(zipUrl, window.location.origin).href;
	} catch {
		return zipUrl;
	}
}

function isGsplatZipUrl(url: string): boolean {
	try {
		const pathname = new URL(url, "http://local.invalid").pathname;
		return pathname.startsWith("/gsplat/") && pathname.endsWith(".zip");
	} catch {
		return url.includes("/gsplat/") && url.includes(".zip");
	}
}

function zipResponse(bytes: ArrayBuffer): Response {
	return new Response(bytes.slice(0), {
		status: 200,
		headers: {
			"Content-Type": "application/zip",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}

async function readCachedZip(url: string): Promise<ArrayBuffer | null> {
	if (typeof caches === "undefined") {
		return null;
	}
	try {
		const cache = await caches.open(GSPLAT_ZIP_CACHE_NAME);
		const hit = await cache.match(url);
		if (!hit?.ok) {
			return null;
		}
		return hit.arrayBuffer();
	} catch {
		return null;
	}
}

async function writeCachedZip(url: string, bytes: ArrayBuffer): Promise<void> {
	if (typeof caches === "undefined") {
		return;
	}
	try {
		const cache = await caches.open(GSPLAT_ZIP_CACHE_NAME);
		await cache.put(url, zipResponse(bytes));
	} catch {
		// Private mode / quota — memory cache still helps for this page.
	}
}

async function loadGsplatZipBytes(
	url: string,
	init?: RequestInit,
): Promise<ArrayBuffer> {
	const absoluteUrl = resolveGsplatZipAbsoluteUrl(url);
	const cachedMemory = zipBytesByUrl.get(absoluteUrl);
	if (cachedMemory) {
		return cachedMemory;
	}

	const inflight = zipInflightByUrl.get(absoluteUrl);
	if (inflight) {
		return inflight;
	}

	const download = (async () => {
		const fromCache = await readCachedZip(absoluteUrl);
		if (fromCache && fromCache.byteLength > 0) {
			zipBytesByUrl.set(absoluteUrl, fromCache);
			return fromCache;
		}

		const fetchImpl =
			nativeFetch ??
			(typeof window !== "undefined" ? window.fetch.bind(window) : fetch);
		const response = await fetchImpl(absoluteUrl, {
			...init,
			credentials: init?.credentials ?? "same-origin",
		});
		if (!response.ok) {
			throw new Error(
				`Failed to download 3DGS avatar zip (${response.status})`,
			);
		}
		const bytes = await response.arrayBuffer();
		zipBytesByUrl.set(absoluteUrl, bytes);
		void writeCachedZip(absoluteUrl, bytes);
		return bytes;
	})().finally(() => {
		zipInflightByUrl.delete(absoluteUrl);
	});

	zipInflightByUrl.set(absoluteUrl, download);
	return download;
}

/**
 * Patch window.fetch so every `/gsplat/*.zip` request (ours or the renderer)
 * shares one in-flight download and then serves from memory / Cache API.
 */
export function installGsplatZipCache(): void {
	if (zipFetchInstalled || typeof window === "undefined") {
		return;
	}
	zipFetchInstalled = true;
	const fetchNetwork: typeof fetch = window.fetch.bind(window);
	nativeFetch = fetchNetwork;

	window.fetch = ((
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const url = resolveRequestUrl(input);
		if (!isGsplatZipUrl(url)) {
			return fetchNetwork(input, init);
		}
		return loadGsplatZipBytes(url, init).then(zipResponse);
	}) as typeof fetch;
}

/** Warm the renderer JS chunk so GsplatViewport's dynamic import is instant. */
export function preloadGsplatRenderer(): Promise<GsplatRendererModule> {
	if (!rendererPromise) {
		rendererPromise = import("@myned-ai/gsplat-flame-avatar-renderer");
	}
	return rendererPromise;
}

/**
 * Kick off zip download into the shared memory/Cache API store.
 * Idempotent and coalesced with renderer fetches via the interceptor.
 */
export function prefetchGsplatAvatarZip(
	avatarId: string | null | undefined,
): void {
	if (typeof window === "undefined") {
		return;
	}
	installGsplatZipCache();
	const zipUrl = getGsplatAvatarZipUrl(avatarId);
	void loadGsplatZipBytes(zipUrl).catch(() => {
		// Live Renderer.create will fetch again through the same interceptor.
	});
}

/**
 * Prefetch zip + renderer module for a catalog avatar id (preview lobby).
 */
export function warmGsplatAvatar(avatarId: string | null | undefined): void {
	if (typeof window === "undefined") {
		return;
	}
	installGsplatZipCache();
	prefetchGsplatAvatarZip(avatarId);
	void preloadGsplatRenderer().catch(() => {
		// Viewport will import again on mount.
	});
}

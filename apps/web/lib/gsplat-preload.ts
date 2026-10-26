/**
 * Prefetch OptiModel SpatialReal packs + warm AvatarKit before Join.
 *
 * Lobby flow:
 * 1. Install a page-level fetch cache for `/spatialreal/*` + `/spatialreal-api/*`
 * 2. Download pack files (shape / ply / idle / character) into memory + Cache API
 * 3. Initialize `@spatius/avatarkit` in host mode and `AvatarManager.load`
 *
 * Join then awaits {@link waitForOptiModelWarmupIdle} so the viewport only
 * mounts AvatarView on already-cached bytes.
 */

import { getOptiModelAsset } from "@/lib/stock-avatars";

const OPTIMODEL_CACHE_NAME = "optimind-optimodel-assets-v1";
const LOCAL_API = "/spatialreal-api";
const LOCAL_TOKEN = "local-offline";
const LOCAL_APP_ID = "local-offline";

const PREFETCH_FILES = [
	"character.json",
	"model_info.json",
	"shape.pb",
	"idle.pb",
	"idle.frame0.json",
	"point_cloud_low.ply",
	"point_cloud_low.csplat.gz",
	"point_cloud_low.ply.gz",
] as const;

type SpatiusAvatarKit = typeof import("@spatius/avatarkit");

let sdkPromise: Promise<SpatiusAvatarKit> | null = null;
/** Serializes preload work so Join can wait until it settles. */
let warmupGate: Promise<void> = Promise.resolve();
/** Dedupes AvatarSDK.initialize / AvatarManager.load across remounts. */
let runtimeWarmPromise: Promise<void> | null = null;
let runtimeWarmKey: string | null = null;

let fetchCacheInstalled = false;
let nativeFetch: typeof fetch | null = null;
const memoryBytes = new Map<string, ArrayBuffer>();
const memoryInflight = new Map<string, Promise<ArrayBuffer>>();

function resolveRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

function pathnameOf(url: string): string {
	try {
		return new URL(url, window.location.origin).pathname;
	} catch {
		return url;
	}
}

function isOptiModelAssetUrl(url: string): boolean {
	const path = pathnameOf(url);
	return (
		path.startsWith("/spatialreal/") ||
		path.startsWith("/spatialreal-api/")
	);
}

function cacheKeyFor(url: string): string {
	try {
		return new URL(url, window.location.origin).href;
	} catch {
		return url;
	}
}

function arrayBufferResponse(bytes: ArrayBuffer, url: string): Response {
	const path = pathnameOf(url);
	const contentType = path.endsWith(".json")
		? "application/json"
		: path.endsWith(".pb")
			? "application/octet-stream"
			: path.endsWith(".ply")
				? "application/octet-stream"
				: path.endsWith(".gz")
					? "application/gzip"
					: "application/octet-stream";
	return new Response(bytes.slice(0), {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=3600",
		},
	});
}

async function readCache(url: string): Promise<ArrayBuffer | null> {
	const key = cacheKeyFor(url);
	const hit = memoryBytes.get(key);
	if (hit) return hit;
	if (typeof caches === "undefined") return null;
	try {
		const cache = await caches.open(OPTIMODEL_CACHE_NAME);
		const response = await cache.match(key);
		if (!response) return null;
		const bytes = await response.arrayBuffer();
		memoryBytes.set(key, bytes);
		return bytes;
	} catch {
		return null;
	}
}

async function writeCache(url: string, bytes: ArrayBuffer): Promise<void> {
	const key = cacheKeyFor(url);
	memoryBytes.set(key, bytes);
	if (typeof caches === "undefined") return;
	try {
		const cache = await caches.open(OPTIMODEL_CACHE_NAME);
		await cache.put(key, arrayBufferResponse(bytes, key));
	} catch {
		/* private mode / quota */
	}
}

async function loadOptiModelBytes(
	url: string,
	init?: RequestInit,
): Promise<ArrayBuffer> {
	const key = cacheKeyFor(url);
	const cached = await readCache(key);
	if (cached) return cached;

	const inflight = memoryInflight.get(key);
	if (inflight) return inflight;

	const fetchImpl = nativeFetch ?? fetch;
	const promise = (async () => {
		const response = await fetchImpl(key, {
			...init,
			credentials: "same-origin",
		});
		if (!response.ok) {
			throw new Error(
				`Failed to download OptiModel asset (${response.status}) ${key}`,
			);
		}
		const bytes = await response.arrayBuffer();
		await writeCache(key, bytes);
		return bytes;
	})().finally(() => {
		memoryInflight.delete(key);
	});

	memoryInflight.set(key, promise);
	return promise;
}

/**
 * Patch window.fetch so every OptiModel `/spatialreal/*` request (ours or
 * AvatarKit) shares one memory + Cache API copy.
 */
export function installOptiModelAssetCache(): void {
	if (fetchCacheInstalled || typeof window === "undefined") return;
	fetchCacheInstalled = true;
	nativeFetch = window.fetch.bind(window);

	window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		const url = resolveRequestUrl(input);
		if (!isOptiModelAssetUrl(url)) {
			return nativeFetch!(input, init);
		}
		return loadOptiModelBytes(url, init).then((bytes) =>
			arrayBufferResponse(bytes, url),
		);
	};
}

export function preloadOptiModelSdk(): Promise<SpatiusAvatarKit> {
	if (!sdkPromise) {
		sdkPromise = import("@spatius/avatarkit");
	}
	return sdkPromise;
}

function assetUrlsFor(avatarId: string | null | undefined): string[] {
	const asset = getOptiModelAsset(avatarId);
	const base = `/spatialreal/${asset.dir}`;
	const urls = PREFETCH_FILES.map((file) => `${base}/${file}`);
	urls.push(`/spatialreal-api/v2/avatar/${asset.characterId}`);
	return urls;
}

/** Best-effort pack download (does not fail the warm if optional files 404). */
export async function prefetchOptiModelAssets(
	avatarId: string | null | undefined,
): Promise<void> {
	installOptiModelAssetCache();
	await Promise.all(
		assetUrlsFor(avatarId).map((url) =>
			loadOptiModelBytes(url).catch(() => null),
		),
	);
}

/**
 * Initialize AvatarKit host mode + cache the character via AvatarManager.load.
 * Safe to call from the lobby — does not create AvatarView / LiveKit sessions.
 */
export function warmOptiModelRuntime(
	avatarId: string | null | undefined,
): Promise<void> {
	if (!avatarId) return Promise.resolve();
	const asset = getOptiModelAsset(avatarId);
	const key = asset.characterId;

	if (runtimeWarmPromise && runtimeWarmKey === key) {
		return runtimeWarmPromise;
	}

	runtimeWarmKey = key;
	runtimeWarmPromise = (async () => {
		installOptiModelAssetCache();
		// Kick pack downloads immediately; SDK init can overlap.
		const assetsPromise = prefetchOptiModelAssets(avatarId);
		const [kit] = await Promise.all([
			preloadOptiModelSdk(),
			import("@repo/arkit-flame").catch(() => null),
		]);

		await kit.AvatarSDK.initialize(LOCAL_APP_ID, {
			drivingServiceMode: kit.DrivingServiceMode.backend,
			logLevel: kit.LogLevel.warning,
			customEndpoint: `${window.location.origin}${LOCAL_API}`,
		});
		kit.AvatarSDK.setSessionToken(LOCAL_TOKEN);

		await assetsPromise;

		try {
			await kit.AvatarManager.shared.load(asset.characterId, () => {
				/* progress ignored during lobby warm */
			});
		} catch {
			// Live OptiModelViewport will load again; pack cache still helps.
		}
	})().catch((error) => {
		if (runtimeWarmKey === key) {
			runtimeWarmPromise = null;
			runtimeWarmKey = null;
		}
		throw error;
	});

	return runtimeWarmPromise;
}

/** Run work on the warmup gate so Join can wait until it settles. */
export function runOptiModelWarmup(work: () => Promise<void>): Promise<void> {
	const run = warmupGate.then(work, work);
	warmupGate = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

/** Await any in-flight OptiModel warmup before mounting the live viewport. */
export function waitForOptiModelWarmupIdle(): Promise<void> {
	return warmupGate;
}

/** Fire-and-forget lobby warm (assets + SDK + AvatarManager.load). */
export function warmGsplatAvatar(avatarId: string | null | undefined): void {
	if (!avatarId) return;
	void runOptiModelWarmup(async () => {
		await warmOptiModelRuntime(avatarId);
	});
}

/** @deprecated Prefer {@link prefetchOptiModelAssets}. */
export function prefetchGsplatAvatarZip(
	avatarId: string | null | undefined,
): void {
	void prefetchOptiModelAssets(avatarId);
}

/** @deprecated Prefer {@link installOptiModelAssetCache}. */
export function installGsplatZipCache(): void {
	installOptiModelAssetCache();
}

/** @deprecated OptiModel no longer uses the LAM gsplat zip renderer. */
export function preloadGsplatRenderer(): Promise<null> {
	return preloadOptiModelSdk().then(() => null);
}

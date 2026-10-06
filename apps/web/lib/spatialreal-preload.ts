/**
 * Warm the SpatialReal JS/WASM module and shared template assets
 * (`base_model.pb.gz`) before a LiveKit session starts.
 *
 * Do NOT call createSession() here: an SDK-mode warmup session that is aborted
 * or disposed when Join starts can leave the SDK stuck in "connecting" for the
 * real LiveKit session (no avatar audio). Module + AvatarSDK.initialize alone
 * are safe — createSession's ensureRuntime reuses an already-initialized core.
 *
 * The SDK always `fetch()`es `base_model.pb.gz` during initialize and does not
 * use its Cache API for the unified model path. We install a page-level fetch
 * interceptor so prefetch, warmup init, Join, and re-entry all share one
 * in-memory (and Cache API) copy of the ~28 MB file.
 *
 * The same interceptor rewrites the SDK's ~1.3MB `data:application/wasm`
 * fetch to `/_spatialreal/*.wasm` (copied by withSpatialReal). Bundlers and
 * browsers are unreliable with that data URL; a failed rewrite surfaces as
 * `wasm-load-failed` / "Failed to load the avatar runtime (WASM/templates)."
 */

type SpatialRealSdk = typeof import("@spatialreal/web-sdk");

let sdkPromise: Promise<SpatialRealSdk> | null = null;
/** Serializes preload work so the live session never overlaps a dispose. */
let warmupGate: Promise<void> = Promise.resolve();
/** Dedupes AvatarSDK.initialize / avatar asset load across remounts. */
let runtimeWarmPromise: Promise<void> | null = null;
let runtimeWarmKey: string | null = null;

const PRODUCTION_BASE_MODEL_URL =
	"https://cdn.spatialreal.cloud/sdk/base_model.pb.gz";
const BASE_MODEL_CACHE_NAME = "optimind-spatialreal-base-model-v1";
const SPATIALREAL_WASM_MANIFEST_URL = "/_spatialreal/manifest.json";

let baseModelFetchInstalled = false;
let baseModelBytes: ArrayBuffer | null = null;
let baseModelInflight: Promise<ArrayBuffer> | null = null;
/** Resolved `/_spatialreal/avatar_core_wasm-*.wasm` public URL. */
let spatialRealWasmPublicUrl: string | null = null;
let spatialRealWasmPublicUrlPromise: Promise<string | null> | null = null;
/** Native fetch captured before we patch window.fetch. */
let nativeFetch: typeof fetch | null = null;

function resolveRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	return input.url;
}

function isBaseModelUrl(url: string): boolean {
	return (
		url === PRODUCTION_BASE_MODEL_URL ||
		url.endsWith("/sdk/base_model.pb.gz") ||
		url.includes("/sdk/base_model.pb.gz?")
	);
}

function isEmbeddedWasmDataUrl(url: string): boolean {
	return url.startsWith("data:application/wasm");
}

async function resolveSpatialRealWasmPublicUrl(
	fetchImpl: typeof fetch,
): Promise<string | null> {
	if (spatialRealWasmPublicUrl) {
		return spatialRealWasmPublicUrl;
	}
	if (!spatialRealWasmPublicUrlPromise) {
		spatialRealWasmPublicUrlPromise = (async () => {
			try {
				const response = await fetchImpl(SPATIALREAL_WASM_MANIFEST_URL, {
					cache: "force-cache",
				});
				if (!response.ok) {
					return null;
				}
				const body = (await response.json()) as { wasm?: unknown };
				if (typeof body.wasm !== "string" || !body.wasm.endsWith(".wasm")) {
					return null;
				}
				spatialRealWasmPublicUrl = `/_spatialreal/${body.wasm}`;
				return spatialRealWasmPublicUrl;
			} catch {
				return null;
			} finally {
				spatialRealWasmPublicUrlPromise = null;
			}
		})();
	}
	return spatialRealWasmPublicUrlPromise;
}

function baseModelResponse(bytes: ArrayBuffer): Response {
	return new Response(bytes.slice(0), {
		status: 200,
		headers: {
			"Content-Type": "application/octet-stream",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}

async function readCachedBaseModel(url: string): Promise<ArrayBuffer | null> {
	if (typeof caches === "undefined") {
		return null;
	}
	try {
		const cache = await caches.open(BASE_MODEL_CACHE_NAME);
		const hit = await cache.match(url);
		if (!hit?.ok) {
			return null;
		}
		return hit.arrayBuffer();
	} catch {
		return null;
	}
}

async function writeCachedBaseModel(
	url: string,
	bytes: ArrayBuffer,
): Promise<void> {
	if (typeof caches === "undefined") {
		return;
	}
	try {
		const cache = await caches.open(BASE_MODEL_CACHE_NAME);
		await cache.put(url, baseModelResponse(bytes));
	} catch {
		// Private mode / quota — memory cache still helps for this page.
	}
}

async function loadBaseModelBytes(
	url: string,
	init?: RequestInit,
): Promise<ArrayBuffer> {
	if (baseModelBytes) {
		return baseModelBytes;
	}

	if (!baseModelInflight) {
		baseModelInflight = (async () => {
			const cached = await readCachedBaseModel(url);
			if (cached && cached.byteLength > 0) {
				baseModelBytes = cached;
				return cached;
			}

			const fetchImpl =
				nativeFetch ??
				(typeof window !== "undefined"
					? window.fetch.bind(window)
					: fetch);
			const response = await fetchImpl(url, {
				...init,
				mode: init?.mode ?? "cors",
				credentials: init?.credentials ?? "omit",
			});
			if (!response.ok) {
				throw new Error(
					`Failed to download SpatialReal base model (${response.status})`,
				);
			}
			const bytes = await response.arrayBuffer();
			baseModelBytes = bytes;
			void writeCachedBaseModel(url, bytes);
			return bytes;
		})().finally(() => {
			baseModelInflight = null;
		});
	}

	return baseModelInflight;
}

/**
 * Patch window.fetch so every base_model.pb.gz request (ours or the SDK's)
 * shares one in-flight download and then serves from memory / Cache API.
 * Also rewrite the SDK's embedded WASM data: URL to the public/_spatialreal
 * copy that withSpatialReal emits (avoids wasm-load-failed in Next/Turbopack).
 */
export function installSpatialRealBaseModelCache(): void {
	if (baseModelFetchInstalled || typeof window === "undefined") {
		return;
	}
	baseModelFetchInstalled = true;
	const fetchNetwork: typeof fetch = window.fetch.bind(window);
	nativeFetch = fetchNetwork;

	window.fetch = ((
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const url = resolveRequestUrl(input);

		if (isEmbeddedWasmDataUrl(url)) {
			return resolveSpatialRealWasmPublicUrl(fetchNetwork).then(
				(publicUrl) => {
					if (!publicUrl) {
						return fetchNetwork(input, init);
					}
					return fetchNetwork(publicUrl, {
						...init,
						// Public WASM is cross-path same-origin; drop credentials
						// mode that some browsers reject on data: URLs.
						credentials: "same-origin",
					});
				},
			);
		}

		if (!isBaseModelUrl(url)) {
			return fetchNetwork(input, init);
		}

		return loadBaseModelBytes(url, init).then(baseModelResponse);
	}) as typeof fetch;
}

export function preloadSpatialRealSdk(): Promise<SpatialRealSdk> {
	if (!sdkPromise) {
		sdkPromise = import("@spatialreal/web-sdk");
	}
	return sdkPromise;
}

/**
 * Kick off the base model download into the shared memory/Cache API store.
 * Safe without credentials. Idempotent and coalesced with SDK fetches.
 */
export function prefetchSpatialRealBaseModel(): void {
	if (typeof window === "undefined") {
		return;
	}
	installSpatialRealBaseModelCache();
	void loadBaseModelBytes(PRODUCTION_BASE_MODEL_URL).catch(() => {
		// Live createSession will fetch again through the same interceptor.
	});
}

export type WarmSpatialRealRuntimeOptions = {
	appId: string;
	sessionToken?: string | null;
	avatarId?: string | null;
};

/**
 * Initialize the AvatarSDK runtime (WASM + base_model) and optionally cache
 * the avatar's character assets. Page-scoped: later createSession() skips the
 * template download when AvatarSDK.isInitialized; even if it re-inits, the
 * fetch interceptor serves base_model from memory.
 */
export function warmSpatialRealRuntime(
	options: WarmSpatialRealRuntimeOptions,
): Promise<void> {
	const { appId, sessionToken = null, avatarId = null } = options;
	// Token presence matters for avatar load; the token value itself rotates.
	const key = `${appId}::${avatarId ?? ""}::${sessionToken ? "tok" : "notok"}`;

	if (runtimeWarmPromise && runtimeWarmKey === key) {
		return runtimeWarmPromise;
	}

	runtimeWarmKey = key;
	runtimeWarmPromise = (async () => {
		installSpatialRealBaseModelCache();
		prefetchSpatialRealBaseModel();

		const {
			AvatarSDK,
			AvatarManager,
			Environment,
			LogLevel,
			getEnvironmentConfig,
		} = await preloadSpatialRealSdk();

		await AvatarSDK.initialize(appId, {
			environment: Environment.production,
			logLevel: LogLevel.warning,
		});

		if (sessionToken) {
			AvatarSDK.setSessionToken(sessionToken);
		}

		// Best-effort character asset cache. Pass the same RequestIdentity shape
		// createSession uses so the live load hits this cache key.
		if (avatarId && sessionToken) {
			try {
				const endpoints = getEnvironmentConfig(Environment.production);
				await AvatarManager.shared.load(avatarId, undefined, false, {
					appId,
					sessionToken,
					sdkApiBaseUrl: endpoints.sdkApiBaseUrl,
					driveningressBaseUrl: endpoints.driveningressBaseUrl,
				});
			} catch {
				// Live createSession will load the avatar again.
			}
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

/**
 * Run work on the warmup gate so Join can wait until it settles.
 */
export function runSpatialRealWarmup(work: () => Promise<void>): Promise<void> {
	const run = warmupGate.then(work, work);
	warmupGate = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

/** Await any in-flight warmup before starting the live avatar session. */
export function waitForSpatialRealWarmupIdle(): Promise<void> {
	return warmupGate;
}

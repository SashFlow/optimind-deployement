/**
 * Warm the SpatialReal JS/WASM module before a LiveKit session starts.
 *
 * Do NOT call createSession() here: an SDK-mode warmup session that is aborted
 * or disposed when Join starts can leave the SDK stuck in "connecting" for the
 * real LiveKit session (no avatar audio). Module preload alone is safe.
 */

type SpatialRealSdk = typeof import("@spatialreal/web-sdk");

let sdkPromise: Promise<SpatialRealSdk> | null = null;
/** Serializes preload work so the live session never overlaps a dispose. */
let warmupGate: Promise<void> = Promise.resolve();

export function preloadSpatialRealSdk(): Promise<SpatialRealSdk> {
	if (!sdkPromise) {
		sdkPromise = import("@spatialreal/web-sdk");
	}
	return sdkPromise;
}

/**
 * Run work on the warmup gate so Join can wait until it settles.
 */
export function runSpatialRealWarmup(
	work: () => Promise<void>,
): Promise<void> {
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

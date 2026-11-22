import type { FaceLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";
import {
	DEFAULT_PROCTORING_CONFIG,
	type ProctoringConfig,
} from "@/lib/proctoring/config";

export interface ProctoringDetectors {
	face: FaceLandmarker;
	objects: ObjectDetector;
}

export type ProctoringDetectorOptions = Pick<
	ProctoringConfig,
	| "wasmBaseUrl"
	| "faceModelUrl"
	| "objectModelUrl"
	| "faceConfidence"
	| "maxFaces"
>;

type CacheEntry = {
	key: string;
	promise: Promise<ProctoringDetectors>;
	refCount: number;
	releaseTimer: ReturnType<typeof setTimeout> | null;
};

let cache: CacheEntry | null = null;

function cacheKey(options: ProctoringDetectorOptions): string {
	return [
		options.wasmBaseUrl,
		options.faceModelUrl,
		options.objectModelUrl,
		options.faceConfidence,
		options.maxFaces,
	].join("|");
}

/**
 * Prefer CPU for continuous proctoring. GPU (WebGL) fights client avatars
 * (Spatius / Gsplat) and desyncs the first TTS/lip-sync turn. 1 Hz inference
 * is cheap enough on CPU.
 */
async function createDetectors(
	options: ProctoringDetectorOptions,
): Promise<ProctoringDetectors> {
	const { FilesetResolver, FaceLandmarker, ObjectDetector } = await import(
		"@mediapipe/tasks-vision"
	);
	const vision = await FilesetResolver.forVisionTasks(options.wasmBaseUrl);

	const [face, objects] = await Promise.all([
		FaceLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: options.faceModelUrl,
				delegate: "CPU",
			},
			runningMode: "VIDEO",
			numFaces: options.maxFaces,
			minFaceDetectionConfidence: options.faceConfidence,
			minFacePresenceConfidence: options.faceConfidence,
			outputFaceBlendshapes: true,
			outputFacialTransformationMatrixes: true,
		}),
		ObjectDetector.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: options.objectModelUrl,
				delegate: "CPU",
			},
			runningMode: "VIDEO",
			maxResults: 10,
			// Per-check thresholds are applied later; keep this low so they can be tuned freely.
			scoreThreshold: 0.2,
		}),
	]);

	return { face, objects };
}

function closeDetectors(detectors: ProctoringDetectors) {
	try {
		detectors.face.close();
	} catch {
		// already closed
	}
	try {
		detectors.objects.close();
	} catch {
		// already closed
	}
}

/**
 * Shared FaceLandmarker + ObjectDetector for continuous proctoring.
 * Survives React Strict Mode remounts via a short release grace period.
 */
export function acquireProctoringDetectors(
	options: ProctoringDetectorOptions,
): Promise<ProctoringDetectors> {
	const key = cacheKey(options);
	if (cache?.key === key) {
		if (cache.releaseTimer) {
			clearTimeout(cache.releaseTimer);
			cache.releaseTimer = null;
		}
		cache.refCount += 1;
		return cache.promise;
	}

	if (cache) {
		const previous = cache;
		cache = null;
		if (previous.releaseTimer) {
			clearTimeout(previous.releaseTimer);
		}
		void previous.promise.then(closeDetectors).catch(() => undefined);
	}

	const promise = createDetectors(options).catch((error) => {
		if (cache?.promise === promise) {
			cache = null;
		}
		throw error;
	});

	cache = {
		key,
		promise,
		refCount: 1,
		releaseTimer: null,
	};
	return promise;
}

export function releaseProctoringDetectors() {
	if (!cache) {
		return;
	}
	cache.refCount = Math.max(0, cache.refCount - 1);
	if (cache.refCount > 0) {
		return;
	}
	const entry = cache;
	if (entry.releaseTimer) {
		clearTimeout(entry.releaseTimer);
	}
	// Long grace so lobby warmup survives the candidate reading instructions
	// before Start, and so Strict Mode remount / lobby→session can re-acquire.
	entry.releaseTimer = setTimeout(() => {
		if (cache !== entry || entry.refCount > 0) {
			return;
		}
		cache = null;
		void entry.promise.then(closeDetectors).catch(() => undefined);
	}, 60_000);
}

/** Kick off model/WASM load on the prejoin lobby so connect doesn't pay for it. */
export function warmProctoringDetectors(
	options?: Partial<ProctoringDetectorOptions>,
): void {
	const merged: ProctoringDetectorOptions = {
		wasmBaseUrl:
			options?.wasmBaseUrl ?? DEFAULT_PROCTORING_CONFIG.wasmBaseUrl,
		faceModelUrl:
			options?.faceModelUrl ?? DEFAULT_PROCTORING_CONFIG.faceModelUrl,
		objectModelUrl:
			options?.objectModelUrl ?? DEFAULT_PROCTORING_CONFIG.objectModelUrl,
		faceConfidence:
			options?.faceConfidence ?? DEFAULT_PROCTORING_CONFIG.faceConfidence,
		maxFaces: options?.maxFaces ?? DEFAULT_PROCTORING_CONFIG.maxFaces,
	};
	void acquireProctoringDetectors(merged)
		.then(() => {
			// Drop the warm ref; acquire during the session keeps the cache alive
			// via the grace period if session starts immediately after.
			releaseProctoringDetectors();
		})
		.catch((error) => {
			console.warn("Proctoring: warmup failed", error);
		});
}

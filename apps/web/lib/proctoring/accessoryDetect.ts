import type { ObjectDetector } from "@mediapipe/tasks-vision";

/** Default labels expected from a custom accessory TFLite ObjectDetector. */
export const DEFAULT_ACCESSORY_LABELS = [
	"headphones",
	"earbuds",
	"earphones",
	"headset",
	"earphone",
	"earbud",
];

export type AccessoryDetection = {
	detected: boolean;
	labels: string[];
	scores: number[];
};

/**
 * Run a custom MediaPipe ObjectDetector trained for headphones / earbuds.
 * Returns empty when the detector is unavailable.
 */
export function detectAccessories(
	detector: ObjectDetector | null | undefined,
	video: HTMLVideoElement,
	opts: {
		minConfidence?: number;
		labels?: string[];
	} = {},
): AccessoryDetection {
	if (!detector || !video.videoWidth || !video.videoHeight) {
		return { detected: false, labels: [], scores: [] };
	}

	const minConfidence = opts.minConfidence ?? 0.45;
	const allowed = new Set(
		(opts.labels ?? DEFAULT_ACCESSORY_LABELS).map((label) =>
			label.toLowerCase(),
		),
	);

	try {
		const result = detector.detectForVideo(video, performance.now());
		const labels: string[] = [];
		const scores: number[] = [];
		for (const detection of result.detections) {
			const category = detection.categories[0];
			if (!category) {
				continue;
			}
			const name = (category.categoryName || "").toLowerCase().trim();
			const score = category.score ?? 0;
			if (!name || score < minConfidence) {
				continue;
			}
			if (allowed.size > 0 && !allowed.has(name)) {
				continue;
			}
			labels.push(name);
			scores.push(score);
		}
		return {
			detected: labels.length > 0,
			labels,
			scores,
		};
	} catch (error) {
		console.warn("Accessory detector inference failed", error);
		return { detected: false, labels: [], scores: [] };
	}
}

/**
 * Create a MediaPipe ObjectDetector for a customer-supplied TFLite model.
 * Returns null when the model URL is empty or load fails (soft-fail).
 */
export async function createAccessoryDetector(opts: {
	wasmBaseUrl: string;
	modelAssetPath: string;
}): Promise<ObjectDetector | null> {
	const path = opts.modelAssetPath.trim();
	if (!path) {
		return null;
	}

	try {
		const { FilesetResolver, ObjectDetector } = await import(
			"@mediapipe/tasks-vision"
		);
		const vision = await FilesetResolver.forVisionTasks(opts.wasmBaseUrl);
		const create = (delegate: "GPU" | "CPU") =>
			ObjectDetector.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: path,
					delegate,
				},
				runningMode: "VIDEO",
				maxResults: 5,
				scoreThreshold: 0.25,
			});
		try {
			return await create("GPU");
		} catch {
			return await create("CPU");
		}
	} catch (error) {
		console.warn(
			`Accessory detector model failed to load (${path}). Place your TFLite model there or update faceCapture.accessoryModelUrl.`,
			error,
		);
		return null;
	}
}

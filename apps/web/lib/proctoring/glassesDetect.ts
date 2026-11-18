import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** MediaPipe Face Mesh indices used for glasses frame sampling. */
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 362;
const NOSE_BRIDGE = 168;
const LEFT_CHEEK = 50;
const RIGHT_CHEEK = 280;

function luminance(data: Uint8ClampedArray, index: number) {
	const r = data[index] ?? 0;
	const g = data[index + 1] ?? 0;
	const b = data[index + 2] ?? 0;
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sampleLuma(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	nx: number,
	ny: number,
) {
	const x = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))));
	const y = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))));
	return luminance(data, (y * width + x) * 4);
}

function mean(values: number[]) {
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Landmark + pixel heuristic for spectacle frames.
 * Samples a strip across the eyes / nose bridge and compares to cheek skin.
 * Dark contiguous band relative to cheeks → likely glasses.
 */
export function detectGlassesFromLandmarks(
	landmarks: NormalizedLandmark[],
	imageData: ImageData,
	/** Minimum cheek-vs-frame luminance delta (0–255). */
	minDelta = 28,
): boolean {
	const leftOuter = landmarks[LEFT_EYE_OUTER];
	const leftInner = landmarks[LEFT_EYE_INNER];
	const rightOuter = landmarks[RIGHT_EYE_OUTER];
	const rightInner = landmarks[RIGHT_EYE_INNER];
	const bridge = landmarks[NOSE_BRIDGE];
	const leftCheek = landmarks[LEFT_CHEEK];
	const rightCheek = landmarks[RIGHT_CHEEK];
	if (
		!leftOuter ||
		!leftInner ||
		!rightOuter ||
		!rightInner ||
		!bridge ||
		!leftCheek ||
		!rightCheek
	) {
		return false;
	}

	const { data, width, height } = imageData;
	const framePoints: Array<{ x: number; y: number }> = [];
	const steps = 10;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		framePoints.push({
			x: leftOuter.x + (leftInner.x - leftOuter.x) * t,
			y: leftOuter.y + (leftInner.y - leftOuter.y) * t - 0.012,
		});
		framePoints.push({
			x: rightInner.x + (rightOuter.x - rightInner.x) * t,
			y: rightInner.y + (rightOuter.y - rightInner.y) * t - 0.012,
		});
	}
	framePoints.push({ x: bridge.x, y: bridge.y - 0.01 });

	const frameLuma = framePoints.map((point) =>
		sampleLuma(data, width, height, point.x, point.y),
	);
	const cheekLuma = [
		sampleLuma(data, width, height, leftCheek.x, leftCheek.y),
		sampleLuma(data, width, height, rightCheek.x, rightCheek.y),
		sampleLuma(data, width, height, leftCheek.x, leftCheek.y + 0.02),
		sampleLuma(data, width, height, rightCheek.x, rightCheek.y + 0.02),
	];

	const frameMean = mean(frameLuma);
	const cheekMean = mean(cheekLuma);
	const darkCount = frameLuma.filter(
		(value) => value < cheekMean - minDelta,
	).length;
	const darkRatio = darkCount / Math.max(frameLuma.length, 1);

	return cheekMean - frameMean >= minDelta && darkRatio >= 0.35;
}

/** Draw the current video frame into ImageData for pixel sampling. */
export function videoFrameImageData(
	video: HTMLVideoElement,
	canvas?: HTMLCanvasElement,
): ImageData | null {
	const width = video.videoWidth;
	const height = video.videoHeight;
	if (!width || !height) {
		return null;
	}
	const target = canvas ?? document.createElement("canvas");
	target.width = width;
	target.height = height;
	const ctx = target.getContext("2d", { willReadFrequently: true });
	if (!ctx) {
		return null;
	}
	ctx.drawImage(video, 0, 0, width, height);
	return ctx.getImageData(0, 0, width, height);
}

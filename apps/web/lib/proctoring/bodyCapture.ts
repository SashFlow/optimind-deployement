import type {
	NormalizedLandmark,
	PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { BodyCaptureConfig } from "@/lib/proctoring/config";
import { boxDelta, type NormalizedRect } from "@/lib/proctoring/idCard";

export type BodyCaptureHint =
	| "no_person"
	| "multiple_people"
	| "step_back"
	| "step_closer"
	| "show_feet"
	| "show_head"
	| "center"
	| "hold_steady";

export const BODY_CAPTURE_HINTS: Record<BodyCaptureHint, string> = {
	no_person: "Stand so your full body is visible in the frame",
	multiple_people: "Only one person should be visible",
	step_back: "Step farther from the camera so head to feet fit",
	step_closer: "Step a little closer to the camera",
	show_feet: "Make sure your feet are visible at the bottom",
	show_head: "Make sure your head is visible at the top",
	center: "Center yourself in the box",
	hold_steady: "Hold steady…",
};

export interface BodyDetection {
	/** Full body is well framed and ready to capture. */
	detected: boolean;
	/** Exactly one person was found. */
	personFound: boolean;
	confidence: number;
	box: NormalizedRect | null;
	hint: BodyCaptureHint;
}

export interface BodyCaptureResult {
	/** Full JPEG frame as evidence. */
	frame: Blob;
	/** Data URL of `frame`, for previews. */
	dataUrl: string;
	box: NormalizedRect;
	confidence: number;
	timestamp: number;
}

/** MediaPipe Pose landmark indices. */
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT = 31;
const RIGHT_FOOT = 32;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** Tall portrait guide the candidate lines their full body up with. */
export function bodyGuideRect(config: BodyCaptureConfig): NormalizedRect {
	const width = config.guideWidthRatio;
	const height = config.guideHeightRatio;
	return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

function visible(
	landmark: NormalizedLandmark | undefined,
	minVisibility: number,
): landmark is NormalizedLandmark {
	return (
		landmark != null &&
		(landmark.visibility == null || landmark.visibility >= minVisibility)
	);
}

function landmarksBox(points: NormalizedLandmark[]): NormalizedRect {
	let minX = 1;
	let minY = 1;
	let maxX = 0;
	let maxY = 0;
	for (const point of points) {
		minX = Math.min(minX, point.x);
		minY = Math.min(minY, point.y);
		maxX = Math.max(maxX, point.x);
		maxY = Math.max(maxY, point.y);
	}
	return {
		x: clamp(minX, 0, 1),
		y: clamp(minY, 0, 1),
		width: clamp(maxX - minX, 0, 1),
		height: clamp(maxY - minY, 0, 1),
	};
}

/** Evaluate whether a MediaPipe pose result is well framed for full-body capture. */
export function evaluateBodyFraming(
	result: PoseLandmarkerResult,
	config: BodyCaptureConfig,
): BodyDetection {
	const poses = result.landmarks;
	if (!poses?.length) {
		return {
			detected: false,
			personFound: false,
			confidence: 0,
			box: null,
			hint: "no_person",
		};
	}
	if (poses.length > 1) {
		return {
			detected: false,
			personFound: false,
			confidence: 0,
			box: null,
			hint: "multiple_people",
		};
	}

	const landmarks = poses[0];
	if (!landmarks?.length) {
		return {
			detected: false,
			personFound: false,
			confidence: 0,
			box: null,
			hint: "no_person",
		};
	}

	const nose = landmarks[NOSE];
	const leftShoulder = landmarks[LEFT_SHOULDER];
	const rightShoulder = landmarks[RIGHT_SHOULDER];
	const footCandidates = [
		landmarks[LEFT_ANKLE],
		landmarks[RIGHT_ANKLE],
		landmarks[LEFT_HEEL],
		landmarks[RIGHT_HEEL],
		landmarks[LEFT_FOOT],
		landmarks[RIGHT_FOOT],
	].filter((point): point is NormalizedLandmark =>
		visible(point, config.minVisibility),
	);

	const headVisible = visible(nose, config.minVisibility);
	const shouldersVisible =
		visible(leftShoulder, config.minVisibility) ||
		visible(rightShoulder, config.minVisibility);

	if (!headVisible && !shouldersVisible) {
		return {
			detected: false,
			personFound: false,
			confidence: 0,
			box: null,
			hint: "show_head",
		};
	}
	if (footCandidates.length === 0) {
		return {
			detected: false,
			personFound: true,
			confidence: 0.4,
			box: null,
			hint: "show_feet",
		};
	}

	const points: NormalizedLandmark[] = [];
	if (headVisible) {
		points.push(nose);
	}
	if (visible(leftShoulder, config.minVisibility)) {
		points.push(leftShoulder);
	}
	if (visible(rightShoulder, config.minVisibility)) {
		points.push(rightShoulder);
	}
	points.push(...footCandidates);

	const box = landmarksBox(points);
	const guide = bodyGuideRect(config);
	const bodyCenterX = box.x + box.width / 2;
	const bodyCenterY = box.y + box.height / 2;
	const guideCenterX = guide.x + guide.width / 2;
	const guideCenterY = guide.y + guide.height / 2;
	const offsetX = Math.abs(bodyCenterX - guideCenterX) / guide.width;
	const offsetY = Math.abs(bodyCenterY - guideCenterY) / guide.height;
	const heightRatio = box.height / guide.height;

	const visibilityScores = points
		.map((point) => point.visibility ?? 1)
		.filter((score) => Number.isFinite(score));
	const confidence =
		visibilityScores.length > 0
			? visibilityScores.reduce((sum, score) => sum + score, 0) /
				visibilityScores.length
			: 0.5;

	let hint: BodyCaptureHint = "hold_steady";
	if (!headVisible) {
		hint = "show_head";
	} else if (heightRatio < config.minBodyHeightRatio) {
		hint = "step_closer";
	} else if (heightRatio > config.maxBodyHeightRatio) {
		hint = "step_back";
	} else if (
		offsetX > config.centerTolerance ||
		offsetY > config.centerTolerance
	) {
		hint = "center";
	}

	return {
		detected: hint === "hold_steady",
		personFound: true,
		confidence: clamp(confidence, 0, 1),
		box,
		hint,
	};
}

export { boxDelta };

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new Error("Unable to encode captured frame")),
			"image/jpeg",
			quality,
		);
	});
}

/** Grabs the current camera frame at full resolution. */
export async function captureBody(
	video: HTMLVideoElement,
	detection: BodyDetection & { box: NormalizedRect },
	config: BodyCaptureConfig,
): Promise<BodyCaptureResult> {
	const frameCanvas = document.createElement("canvas");
	frameCanvas.width = video.videoWidth;
	frameCanvas.height = video.videoHeight;
	const frameCtx = frameCanvas.getContext("2d");
	if (!frameCtx) {
		throw new Error("Unable to create capture canvas");
	}
	frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

	const frame = await canvasToBlob(frameCanvas, config.jpegQuality);

	return {
		frame,
		dataUrl: frameCanvas.toDataURL("image/jpeg", config.jpegQuality),
		box: detection.box,
		confidence: detection.confidence,
		timestamp: Date.now(),
	};
}

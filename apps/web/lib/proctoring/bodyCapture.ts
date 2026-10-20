import type {
	NormalizedLandmark,
	PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { BodyCaptureConfig } from "@/lib/proctoring/config";
import { boxDelta, type NormalizedRect } from "@/lib/proctoring/idCard";

export type BodyCaptureHint =
	| "no_body"
	| "multiple_people"
	| "move_closer"
	| "move_back"
	| "center"
	| "hold_steady";

export const BODY_CAPTURE_HINTS: Record<BodyCaptureHint, string> = {
	no_body: "Stand so your full upper body is visible in the frame",
	multiple_people: "Only one person should be visible",
	move_closer: "Step a little closer to the camera",
	move_back: "Step a little farther from the camera",
	center: "Center your body in the frame",
	hold_steady: "Hold steady…",
};

/** Spoken / agent-facing framing tips (used for periodic add_context). */
export const BODY_FRAMING_CONTEXT: Record<BodyCaptureHint, string> = {
	no_body:
		"The candidate's body is not fully visible. Ask them to stand so their head, shoulders, and hips are in frame.",
	multiple_people:
		"More than one person is visible. Ask the candidate to ensure only they are in the camera frame.",
	move_closer:
		"The candidate is too far from the camera. Ask them to step closer so their body fills more of the frame.",
	move_back:
		"The candidate is too close to the camera. Ask them to step back so their full upper body fits in the frame.",
	center: "The candidate is off-center. Ask them to center their body in the frame.",
	hold_steady: "The candidate's body is well framed. Hold for capture.",
};

export interface BodyDetection {
	/** Body is well framed and ready to capture. */
	detected: boolean;
	/** At least one pose was found with key joints visible. */
	bodyFound: boolean;
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

/** BlazePose landmark indices used for torso framing. */
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** Centred tall guide the candidate lines their body up with. */
export function bodyGuideRect(
	frameWidth: number,
	frameHeight: number,
	config: BodyCaptureConfig,
): NormalizedRect {
	const frameAspect = frameWidth / frameHeight;
	let width = config.guideWidthRatio;
	let height = (width * frameAspect) / config.aspectRatio;
	if (height > 0.9) {
		height = 0.9;
		width = (height * config.aspectRatio) / frameAspect;
	}
	return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

function landmarkVisible(
	landmark: NormalizedLandmark | undefined,
	minVisibility: number,
): landmark is NormalizedLandmark {
	if (!landmark) {
		return false;
	}
	const visibility =
		typeof landmark.visibility === "number" ? landmark.visibility : 1;
	return visibility >= minVisibility;
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

/** Evaluate whether a MediaPipe pose result is well framed for body capture. */
export function evaluateBodyFraming(
	result: PoseLandmarkerResult,
	frameWidth: number,
	frameHeight: number,
	config: BodyCaptureConfig,
): BodyDetection {
	const poses = result.landmarks;
	if (poses.length === 0) {
		return {
			detected: false,
			bodyFound: false,
			confidence: 0,
			box: null,
			hint: "no_body",
		};
	}
	if (poses.length > 1) {
		return {
			detected: false,
			bodyFound: false,
			confidence: 0,
			box: null,
			hint: "multiple_people",
		};
	}

	const landmarks = poses[0];
	if (!landmarks?.length) {
		return {
			detected: false,
			bodyFound: false,
			confidence: 0,
			box: null,
			hint: "no_body",
		};
	}

	const nose = landmarks[NOSE];
	const leftShoulder = landmarks[LEFT_SHOULDER];
	const rightShoulder = landmarks[RIGHT_SHOULDER];
	const leftHip = landmarks[LEFT_HIP];
	const rightHip = landmarks[RIGHT_HIP];
	const leftAnkle = landmarks[LEFT_ANKLE];
	const rightAnkle = landmarks[RIGHT_ANKLE];

	const core: NormalizedLandmark[] = [];
	for (const point of [
		nose,
		leftShoulder,
		rightShoulder,
		leftHip,
		rightHip,
	]) {
		if (landmarkVisible(point, config.minVisibility)) {
			core.push(point);
		}
	}

	// Need shoulders + hips (and preferably head) for a usable upper-body frame.
	const shouldersOk =
		landmarkVisible(leftShoulder, config.minVisibility) &&
		landmarkVisible(rightShoulder, config.minVisibility);
	const hipsOk =
		landmarkVisible(leftHip, config.minVisibility) &&
		landmarkVisible(rightHip, config.minVisibility);

	if (!shouldersOk || !hipsOk || core.length < 4) {
		return {
			detected: false,
			bodyFound: false,
			confidence: 0,
			box: null,
			hint: "no_body",
		};
	}

	const extent = [...core];
	if (landmarkVisible(leftAnkle, config.minVisibility)) {
		extent.push(leftAnkle);
	}
	if (landmarkVisible(rightAnkle, config.minVisibility)) {
		extent.push(rightAnkle);
	}

	const box = landmarksBox(extent);
	const guide = bodyGuideRect(frameWidth, frameHeight, config);
	const bodyCenterX = box.x + box.width / 2;
	const bodyCenterY = box.y + box.height / 2;
	const guideCenterX = guide.x + guide.width / 2;
	const guideCenterY = guide.y + guide.height / 2;
	const offsetX = Math.abs(bodyCenterX - guideCenterX) / guide.width;
	const offsetY = Math.abs(bodyCenterY - guideCenterY) / guide.height;
	const heightRatio = box.height / guide.height;

	const visibilityScores = core.map((p) =>
		typeof p.visibility === "number" ? p.visibility : 1,
	);
	const confidence = clamp(
		visibilityScores.reduce((a, b) => a + b, 0) / visibilityScores.length,
		0,
		1,
	);

	let hint: BodyCaptureHint = "hold_steady";
	if (heightRatio < config.minBodyHeightRatio) {
		hint = "move_closer";
	} else if (heightRatio > config.maxBodyHeightRatio) {
		hint = "move_back";
	} else if (
		offsetX > config.centerTolerance ||
		offsetY > config.centerTolerance
	) {
		hint = "center";
	}

	return {
		detected: hint === "hold_steady",
		bodyFound: true,
		confidence,
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

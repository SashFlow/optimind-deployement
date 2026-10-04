import type {
	FaceLandmarkerResult,
	NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import type { FaceCaptureConfig } from "@/lib/proctoring/config";
import { boxDelta, type NormalizedRect } from "@/lib/proctoring/idCard";

export type FaceCaptureHint =
	| "no_face"
	| "multiple_faces"
	| "move_closer"
	| "move_back"
	| "center"
	| "hold_steady";

export const FACE_CAPTURE_HINTS: Record<FaceCaptureHint, string> = {
	no_face: "Position your face inside the oval",
	multiple_faces: "Only one face should be visible",
	move_closer: "Move a little closer to the camera",
	move_back: "Move a little farther from the camera",
	center: "Center your face in the oval",
	hold_steady: "Hold steady…",
};

export interface FaceDetection {
	/** Face is well framed and ready to capture. */
	detected: boolean;
	/** Exactly one face was found. */
	faceFound: boolean;
	confidence: number;
	box: NormalizedRect | null;
	hint: FaceCaptureHint;
}

export interface FaceCaptureResult {
	/** Full JPEG frame as evidence. */
	frame: Blob;
	/** Data URL of `frame`, for previews. */
	dataUrl: string;
	box: NormalizedRect;
	confidence: number;
	timestamp: number;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** Centred oval guide the candidate lines their face up with. */
export function faceGuideRect(
	frameWidth: number,
	frameHeight: number,
	config: FaceCaptureConfig,
): NormalizedRect {
	const frameAspect = frameWidth / frameHeight;
	let width = config.guideWidthRatio;
	let height = (width * frameAspect) / config.aspectRatio;
	if (height > 0.75) {
		height = 0.75;
		width = (height * config.aspectRatio) / frameAspect;
	}
	return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

function landmarksBox(landmarks: NormalizedLandmark[]): NormalizedRect {
	let minX = 1;
	let minY = 1;
	let maxX = 0;
	let maxY = 0;
	for (const point of landmarks) {
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

/** Evaluate whether a MediaPipe face result is well framed for capture. */
export function evaluateFaceFraming(
	result: FaceLandmarkerResult,
	frameWidth: number,
	frameHeight: number,
	config: FaceCaptureConfig,
): FaceDetection {
	const faces = result.faceLandmarks;
	if (faces.length === 0) {
		return {
			detected: false,
			faceFound: false,
			confidence: 0,
			box: null,
			hint: "no_face",
		};
	}
	if (faces.length > 1) {
		return {
			detected: false,
			faceFound: false,
			confidence: 0,
			box: null,
			hint: "multiple_faces",
		};
	}

	const landmarks = faces[0];
	if (!landmarks?.length) {
		return {
			detected: false,
			faceFound: false,
			confidence: 0,
			box: null,
			hint: "no_face",
		};
	}

	const box = landmarksBox(landmarks);
	const guide = faceGuideRect(frameWidth, frameHeight, config);
	const faceCenterX = box.x + box.width / 2;
	const faceCenterY = box.y + box.height / 2;
	const guideCenterX = guide.x + guide.width / 2;
	const guideCenterY = guide.y + guide.height / 2;
	const offsetX = Math.abs(faceCenterX - guideCenterX) / guide.width;
	const offsetY = Math.abs(faceCenterY - guideCenterY) / guide.height;
	const widthRatio = box.width / guide.width;

	const score =
		result.faceBlendshapes?.[0]?.categories?.[0]?.score ??
		config.minConfidence;
	const confidence = clamp(score, 0, 1);

	let hint: FaceCaptureHint = "hold_steady";
	if (confidence < config.minConfidence) {
		hint = "no_face";
	} else if (widthRatio < config.minFaceWidthRatio) {
		hint = "move_closer";
	} else if (widthRatio > config.maxFaceWidthRatio) {
		hint = "move_back";
	} else if (
		offsetX > config.centerTolerance ||
		offsetY > config.centerTolerance
	) {
		hint = "center";
	}

	return {
		detected: hint === "hold_steady",
		faceFound: true,
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
export async function captureFace(
	video: HTMLVideoElement,
	detection: FaceDetection & { box: NormalizedRect },
	config: FaceCaptureConfig,
): Promise<FaceCaptureResult> {
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

/** Mirrors the actions handled by the worker's `add_context` RPC. */
export type ProctoringAction = "say" | "generate_reply" | "silent";

export type ProctoringViolation =
	| "multiple_people"
	| "additional_device"
	| "no_face"
	| "gaze_away";

export interface ProctoringCheckConfig {
	enabled: boolean;
	/** How long the condition must hold continuously before it is reported. */
	minDurationMs: number;
	/** Minimum gap between two reports of the same violation while it persists. */
	cooldownMs: number;
	/** What the agent should do with the context. */
	action: ProctoringAction;
	/** Toast title shown to the candidate. */
	title: string;
	/** Sent as `state` to the agent (spoken verbatim when `action` is `say`) and shown in the toast. */
	message: string;
}

export interface MultiplePeopleCheckConfig extends ProctoringCheckConfig {
	/** Minimum object-detector score for a `person` detection to count (0-1). */
	minPersonConfidence: number;
}

export interface AdditionalDeviceCheckConfig extends ProctoringCheckConfig {
	/** Minimum object-detector score for a device detection to count (0-1). */
	minConfidence: number;
	/** COCO labels treated as additional devices. */
	labels: string[];
}

export interface GazeCheckConfig extends ProctoringCheckConfig {
	/** Max head rotation left/right before the candidate counts as looking away (degrees). */
	maxHeadYawDeg: number;
	/** Max head rotation up/down before the candidate counts as looking away (degrees). */
	maxHeadPitchDeg: number;
	/** Eye-look blendshape score above which the eyes count as looking away (0-1). Lower is more sensitive. */
	eyeLookThreshold: number;
}

export interface IdCaptureConfig {
	/** How often a frame is analysed while ID capture is active. */
	intervalMs: number;
	/** Give up and close ID capture after this long without a good frame. */
	timeoutMs: number;
	/** Consecutive good, stable frames required before the frame is captured. */
	requiredStableFrames: number;
	/** Max movement of the detected card between frames, as a fraction of the frame size. */
	stabilityTolerance: number;
	/** Guide width as a fraction of the frame width. */
	guideWidthRatio: number;
	/** Card width / height. ID-1 cards (driving licences, national IDs) are 85.6 x 54 mm. */
	aspectRatio: number;
	/** Allowed relative deviation of the detected card's aspect ratio. */
	aspectTolerance: number;
	/** How far outside/inside the guide the card edges may be, as a fraction of the guide size. */
	edgeSearchMargin: number;
	/** Fraction of an edge that must be continuous for that side of the card to count (0-1). */
	minEdgeCoverage: number;
	/** Floor for the Sobel gradient threshold; raised automatically on busy backgrounds. */
	minEdgeStrength: number;
	/** Minimum variance of the Laplacian inside the card. Higher is stricter about blur. */
	minSharpness: number;
	/** Max fraction of blown-out pixels inside the card (0-1). */
	maxGlareRatio: number;
	/** Acceptable mean brightness range inside the card (0-255). */
	minBrightness: number;
	maxBrightness: number;
	/** JPEG quality of the captured images (0-1). */
	jpegQuality: number;
	/** Padding added around the detected card when cropping, as a fraction of the card size. */
	cropPadding: number;
}

export interface ProctoringConfig {
	/** How often a camera frame is analysed. */
	intervalMs: number;
	/** Minimum face detection/presence confidence for the face landmarker (0-1). */
	faceConfidence: number;
	/** Max faces the landmarker tracks; must be > 1 to detect multiple people. */
	maxFaces: number;
	wasmBaseUrl: string;
	faceModelUrl: string;
	objectModelUrl: string;
	checks: {
		multiplePeople: MultiplePeopleCheckConfig;
		additionalDevice: AdditionalDeviceCheckConfig;
		facePresent: ProctoringCheckConfig;
		gaze: GazeCheckConfig;
	};
	idCapture: IdCaptureConfig;
}

export type ProctoringConfigOverrides = Partial<
	Omit<ProctoringConfig, "checks" | "idCapture">
> & {
	checks?: {
		[K in keyof ProctoringConfig["checks"]]?: Partial<
			ProctoringConfig["checks"][K]
		>;
	};
	idCapture?: Partial<IdCaptureConfig>;
};

export const DEFAULT_PROCTORING_CONFIG: ProctoringConfig = {
	intervalMs: 1000,
	faceConfidence: 0.5,
	maxFaces: 3,
	wasmBaseUrl:
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
	faceModelUrl:
		"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
	objectModelUrl:
		"https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
	checks: {
		multiplePeople: {
			enabled: true,
			minDurationMs: 1_500,
			cooldownMs: 30_000,
			action: "generate_reply",
			minPersonConfidence: 0.5,
			title: "Multiple people detected",
			message:
				"More than one person is visible in the camera. Only the candidate may be present.",
		},
		additionalDevice: {
			enabled: true,
			minDurationMs: 1_000,
			cooldownMs: 30_000,
			action: "generate_reply",
			minConfidence: 0.5,
			labels: ["cell phone", "laptop", "tv", "remote"],
			title: "Additional device detected",
			message:
				"An additional electronic device is visible in the camera. Please put it away.",
		},
		facePresent: {
			enabled: true,
			minDurationMs: 3_000,
			cooldownMs: 20_000,
			action: "say",
			title: "Face not visible",
			message:
				"I can no longer see your face. Please stay in front of the camera.",
		},
		gaze: {
			enabled: false,
			minDurationMs: 3_000,
			cooldownMs: 20_000,
			action: "say",
			maxHeadYawDeg: 25,
			maxHeadPitchDeg: 20,
			eyeLookThreshold: 0.6,
			title: "Looking away",
			message: "Please keep looking at the screen.",
		},
	},
	idCapture: {
		intervalMs: 150,
		timeoutMs: 90_000,
		requiredStableFrames: 5,
		stabilityTolerance: 0.02,
		guideWidthRatio: 0.7,
		aspectRatio: 85.6 / 54,
		aspectTolerance: 0.15,
		edgeSearchMargin: 0.15,
		minEdgeCoverage: 0.55,
		minEdgeStrength: 60,
		minSharpness: 80,
		maxGlareRatio: 0.03,
		minBrightness: 50,
		maxBrightness: 225,
		jpegQuality: 0.92,
		cropPadding: 0.04,
	},
};

export function mergeProctoringConfig(
	overrides: ProctoringConfigOverrides = {},
): ProctoringConfig {
	const { checks = {}, idCapture, ...rest } = overrides;
	const base = DEFAULT_PROCTORING_CONFIG;
	return {
		...base,
		...rest,
		checks: {
			multiplePeople: {
				...base.checks.multiplePeople,
				...checks.multiplePeople,
			},
			additionalDevice: {
				...base.checks.additionalDevice,
				...checks.additionalDevice,
			},
			facePresent: { ...base.checks.facePresent, ...checks.facePresent },
			gaze: { ...base.checks.gaze, ...checks.gaze },
		},
		idCapture: { ...base.idCapture, ...idCapture },
	};
}

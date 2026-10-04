import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import type {
	Category,
	FaceLandmarker,
	FaceLandmarkerResult,
	Matrix,
	ObjectDetector,
} from "@mediapipe/tasks-vision";
import { LocalVideoTrack, ParticipantKind, type Room } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	mergeProctoringConfig,
	type ProctoringAction,
	type ProctoringCheckConfig,
	type ProctoringConfig,
	type ProctoringConfigOverrides,
	type ProctoringViolation,
} from "@/lib/proctoring/config";
import {
	boxDelta as faceBoxDelta,
	captureFace,
	evaluateFaceFraming,
	type FaceCaptureResult,
	type FaceDetection,
} from "@/lib/proctoring/faceCapture";
import {
	boxDelta,
	captureIdCard,
	createIdCardDetector,
	type IdCaptureResult,
	type IdCardDetection,
	type NormalizedRect,
} from "@/lib/proctoring/idCard";

export type ProctoringMode = "PROCTORING" | "ID_CAPTURE" | "FACE_CAPTURE";

export type IdCaptureStatus =
	| "idle"
	| "scanning"
	| "uploading"
	| "captured"
	| "failed";

export type FaceCaptureStatus = IdCaptureStatus;

/** RPC the agent can call on the candidate to open ID capture. */
export const START_ID_CAPTURE_RPC = "start_id_capture";

/** RPC the agent can call on the candidate to open face capture. */
export const START_FACE_CAPTURE_RPC = "start_face_capture";

interface Detectors {
	face: FaceLandmarker;
	objects: ObjectDetector;
}

interface Observation {
	faceCount: number;
	personCount: number;
	devices: string[];
	gazeAway: boolean;
}

interface CheckState {
	since: number | null;
	lastReportedAt: number;
}

const RAD_TO_DEG = 180 / Math.PI;

async function createDetectors(config: ProctoringConfig): Promise<Detectors> {
	const { FilesetResolver, FaceLandmarker, ObjectDetector } = await import(
		"@mediapipe/tasks-vision"
	);
	const vision = await FilesetResolver.forVisionTasks(config.wasmBaseUrl);

	const create = async (delegate: "GPU" | "CPU") =>
		Promise.all([
			FaceLandmarker.createFromOptions(vision, {
				baseOptions: { modelAssetPath: config.faceModelUrl, delegate },
				runningMode: "VIDEO",
				numFaces: config.maxFaces,
				minFaceDetectionConfidence: config.faceConfidence,
				minFacePresenceConfidence: config.faceConfidence,
				outputFaceBlendshapes: true,
				outputFacialTransformationMatrixes: true,
			}),
			ObjectDetector.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: config.objectModelUrl,
					delegate,
				},
				runningMode: "VIDEO",
				maxResults: 10,
				// Per-check thresholds are applied later; keep this low so they can be tuned freely.
				scoreThreshold: 0.2,
			}),
		]);

	try {
		const [face, objects] = await create("GPU");
		return { face, objects };
	} catch (error) {
		console.warn(
			"Proctoring: GPU delegate unavailable, falling back to CPU",
			error,
		);
		const [face, objects] = await create("CPU");
		return { face, objects };
	}
}

/** Head yaw/pitch in degrees from MediaPipe's column-major 4x4 facial transformation matrix. */
function headRotation(matrix: Matrix) {
	const m = (row: number, col: number) => matrix.data[col * 4 + row];
	const yaw = Math.atan2(-m(2, 0), Math.hypot(m(0, 0), m(1, 0))) * RAD_TO_DEG;
	const pitch = Math.atan2(m(2, 1), m(2, 2)) * RAD_TO_DEG;
	return { yaw, pitch };
}

function isGazeAway(
	result: FaceLandmarkerResult,
	config: ProctoringConfig["checks"]["gaze"],
) {
	const matrix = result.facialTransformationMatrixes?.[0];
	if (matrix) {
		const { yaw, pitch } = headRotation(matrix);
		if (
			Math.abs(yaw) > config.maxHeadYawDeg ||
			Math.abs(pitch) > config.maxHeadPitchDeg
		) {
			return true;
		}
	}

	const blendshapes = result.faceBlendshapes?.[0]?.categories;
	if (!blendshapes) {
		return false;
	}
	const score = (name: string) =>
		blendshapes.find((c) => c.categoryName === name)?.score ?? 0;
	const avg = (a: string, b: string) => (score(a) + score(b)) / 2;

	// Both eyes must agree on a direction, which filters out single-eye noise.
	const eyeScores = [
		avg("eyeLookOutLeft", "eyeLookInRight"),
		avg("eyeLookInLeft", "eyeLookOutRight"),
		avg("eyeLookUpLeft", "eyeLookUpRight"),
		avg("eyeLookDownLeft", "eyeLookDownRight"),
	];
	return eyeScores.some((s) => s > config.eyeLookThreshold);
}

function observe(
	detectors: Detectors,
	video: HTMLVideoElement,
	config: ProctoringConfig,
) {
	const now = performance.now();
	const faceResult = detectors.face.detectForVideo(video, now);
	const objectResult = detectors.objects.detectForVideo(video, now);

	const categories = objectResult.detections
		.map((d) => d.categories[0])
		.filter((c): c is Category => c !== undefined);
	const { multiplePeople, additionalDevice, gaze } = config.checks;

	const faceCount = faceResult.faceLandmarks.length;
	return {
		faceCount,
		personCount: categories.filter(
			(c) =>
				c.categoryName === "person" &&
				c.score >= multiplePeople.minPersonConfidence,
		).length,
		devices: categories
			.filter(
				(c) =>
					additionalDevice.labels.includes(c.categoryName) &&
					c.score >= additionalDevice.minConfidence,
			)
			.map((c) => c.categoryName),
		gazeAway: faceCount > 0 && isGazeAway(faceResult, gaze),
	} satisfies Observation;
}

interface AgentContext {
	/** Sent as `state`; spoken verbatim when `action` is `say`. */
	state: string;
	action: ProctoringAction;
	type: ProctoringViolation | "id_captured" | "face_captured";
	details?: Record<string, unknown>;
}

async function sendContext(room: Room, context: AgentContext) {
	const agent = Array.from(room.remoteParticipants.values()).find(
		(p) => p.kind === ParticipantKind.AGENT,
	);
	if (!agent) {
		return;
	}

	try {
		await room.localParticipant.performRpc({
			destinationIdentity: agent.identity,
			method: "add_context",
			payload: JSON.stringify(context),
		});
	} catch (error) {
		console.error("add_context RPC failed", error);
	}
}

function isVideoReady(video: HTMLVideoElement) {
	return (
		video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
		video.videoWidth > 0
	);
}

/** Plays a LiveKit track into a detached `<video>` so frames can be read without touching the UI. */
function attachHiddenVideo(videoTrack: LocalVideoTrack, label: string) {
	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	videoTrack.attach(video);
	// The element is never added to the DOM, so start playback explicitly.
	video
		.play()
		.catch((error) =>
			console.warn(`${label}: video playback failed`, error),
		);
	return video;
}

interface UseProctoringOptions {
	enabled?: boolean;
	/**
	 * When true, registers the `start_id_capture` RPC so the agent can open ID capture
	 * via a tool call. Does not auto-open the overlay on connect.
	 */
	idVerification?: boolean;
	/**
	 * When true, registers the `start_face_capture` RPC so the agent can open face capture
	 * via a tool call. Does not auto-open the overlay on connect.
	 */
	faceVerification?: boolean;
	config?: ProctoringConfigOverrides;
	/**
	 * Pushes a captured ID card to the backend.
	 * Throw to mark the capture as failed so the candidate can retry.
	 */
	onIdCapture?: (result: IdCaptureResult) => Promise<unknown> | unknown;
	/**
	 * Pushes a captured face to the backend.
	 * Throw to mark the capture as failed so the candidate can retry.
	 */
	onFaceCapture?: (result: FaceCaptureResult) => Promise<unknown> | unknown;
}

/**
 * Analyses the local camera with MediaPipe and reports infractions (multiple people, extra
 * devices, missing face, looking away) as a toast and an `add_context` RPC to the agent.
 *
 * Also runs ID / face capture on the same camera track: while either is active, proctoring
 * inference pauses. Capture starts when the agent calls `start_id_capture` /
 * `start_face_capture`, or when the candidate retries from the overlay.
 */
export function useProctoring({
	enabled = true,
	idVerification = false,
	faceVerification = false,
	config: overrides,
	onIdCapture,
	onFaceCapture,
}: UseProctoringOptions = {}) {
	const room = useRoomContext();
	const { cameraTrack, isCameraEnabled } = useLocalParticipant();
	const videoTrack =
		cameraTrack?.track instanceof LocalVideoTrack
			? cameraTrack.track
			: undefined;

	const overridesKey = JSON.stringify(overrides ?? {});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const config = useMemo(
		() => mergeProctoringConfig(overrides),
		[overridesKey],
	);
	const configRef = useRef(config);
	configRef.current = config;
	const onIdCaptureRef = useRef(onIdCapture);
	onIdCaptureRef.current = onIdCapture;
	const onFaceCaptureRef = useRef(onFaceCapture);
	onFaceCaptureRef.current = onFaceCapture;
	/** Sync guards so overlapping ticks / double submits can't fire add_context twice. */
	const idSubmitInFlightRef = useRef(false);
	const idContextSentRef = useRef(false);
	const faceSubmitInFlightRef = useRef(false);
	const faceContextSentRef = useRef(false);
	/** Bumped on each intentional face-capture start; stale submits bail if it changes. */
	const faceCaptureAttemptRef = useRef(0);
	/** Set synchronously when a frame is committed so effect remounts can't double-capture. */
	const faceCaptureCommittedRef = useRef(false);

	const [mode, setModeState] = useState<ProctoringMode>("PROCTORING");
	// The proctoring loop reads this rather than `mode` so pausing doesn't reload the models.
	const modeRef = useRef<ProctoringMode>("PROCTORING");
	const setMode = useCallback((next: ProctoringMode) => {
		modeRef.current = next;
		setModeState(next);
	}, []);

	const [idCaptureStatus, setIdCaptureStatus] =
		useState<IdCaptureStatus>("idle");
	const [idCaptureError, setIdCaptureError] = useState<string | null>(null);
	const [idDetection, setIdDetection] = useState<IdCardDetection | null>(
		null,
	);
	const [idCapture, setIdCapture] = useState<IdCaptureResult | null>(null);

	const [faceCaptureStatus, setFaceCaptureStatus] =
		useState<FaceCaptureStatus>("idle");
	const [faceCaptureError, setFaceCaptureError] = useState<string | null>(
		null,
	);
	const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(
		null,
	);
	const [faceCapture, setFaceCapture] = useState<FaceCaptureResult | null>(
		null,
	);

	const active = enabled && isCameraEnabled && videoTrack !== undefined;

	/** Opens ID capture (or retries after a failure). The camera stays on; proctoring pauses. */
	const startIdCapture = useCallback(() => {
		idSubmitInFlightRef.current = false;
		idContextSentRef.current = false;
		faceSubmitInFlightRef.current = false;
		faceContextSentRef.current = false;
		setFaceCaptureStatus("idle");
		setFaceCaptureError(null);
		setIdCapture(null);
		setIdDetection(null);
		setIdCaptureError(null);
		setIdCaptureStatus("scanning");
		setMode("ID_CAPTURE");
	}, [setMode]);

	/** Closes ID capture without submitting and resumes proctoring. */
	const cancelIdCapture = useCallback(() => {
		idSubmitInFlightRef.current = false;
		idContextSentRef.current = false;
		setIdCaptureStatus("idle");
		setIdCaptureError(null);
		setMode("PROCTORING");
	}, [setMode]);

	/** Opens face capture (or retries after a failure). The camera stays on; proctoring pauses. */
	const startFaceCapture = useCallback(() => {
		// Do not clear guards / restart scanning while an upload or add_context is in flight.
		if (faceSubmitInFlightRef.current) {
			return;
		}
		faceCaptureAttemptRef.current += 1;
		faceCaptureCommittedRef.current = false;
		faceContextSentRef.current = false;
		idSubmitInFlightRef.current = false;
		idContextSentRef.current = false;
		setIdCaptureStatus("idle");
		setIdCaptureError(null);
		setFaceCapture(null);
		setFaceDetection(null);
		setFaceCaptureError(null);
		setFaceCaptureStatus("scanning");
		setMode("FACE_CAPTURE");
	}, [setMode]);

	/** Closes face capture without submitting and resumes proctoring. */
	const cancelFaceCapture = useCallback(() => {
		faceSubmitInFlightRef.current = false;
		faceContextSentRef.current = false;
		faceCaptureCommittedRef.current = false;
		setFaceCaptureStatus("idle");
		setFaceCaptureError(null);
		setMode("PROCTORING");
	}, [setMode]);

	const submitIdCapture = useCallback(
		async (captured: IdCaptureResult) => {
			if (idSubmitInFlightRef.current || idContextSentRef.current) {
				return;
			}
			idSubmitInFlightRef.current = true;
			try {
				const push = onIdCaptureRef.current;
				if (!push) {
					throw new Error("ID capture upload is not configured");
				}
				await push(captured);
				// The candidate may have closed the overlay while the upload was in flight.
				if (modeRef.current !== "ID_CAPTURE") {
					return;
				}
				if (idContextSentRef.current) {
					return;
				}
				idContextSentRef.current = true;

				setIdCaptureStatus("captured");
				setMode("PROCTORING");
				toast.success("ID card captured");
				await sendContext(room, {
					state: "ID card capture completed successfully. The candidate's ID images have been uploaded and submitted for verification. You may continue the conversation.",
					action: "generate_reply",
					type: "id_captured",
					details: {
						confidence: captured.confidence,
						capturedAt: captured.timestamp,
						status: "completed",
					},
				});
			} catch (error) {
				console.error("ID capture: upload failed", error);
				idContextSentRef.current = false;
				if (modeRef.current !== "ID_CAPTURE") {
					return;
				}
				const detail =
					error instanceof Error && error.message.trim()
						? error.message.trim()
						: null;
				setIdCaptureError(
					detail
						? `We could not upload your ID: ${detail}`
						: "We could not upload your ID. Please try again.",
				);
				setIdCaptureStatus("failed");
			} finally {
				idSubmitInFlightRef.current = false;
			}
		},
		[room, setMode],
	);

	const submitFaceCapture = useCallback(
		async (captured: FaceCaptureResult) => {
			if (faceSubmitInFlightRef.current || faceContextSentRef.current) {
				return;
			}
			const attempt = faceCaptureAttemptRef.current;
			faceSubmitInFlightRef.current = true;
			try {
				const push = onFaceCaptureRef.current;
				if (!push) {
					throw new Error("Face capture upload is not configured");
				}
				await push(captured);
				if (attempt !== faceCaptureAttemptRef.current) {
					return;
				}
				if (modeRef.current !== "FACE_CAPTURE") {
					return;
				}
				if (faceContextSentRef.current) {
					return;
				}
				faceContextSentRef.current = true;

				setFaceCaptureStatus("captured");
				// Notify the agent before closing so it can continue the turn.
				await sendContext(room, {
					state: "Face capture completed successfully. The candidate's face image has been uploaded and submitted for verification. You may continue the conversation.",
					action: "generate_reply",
					type: "face_captured",
					details: {
						confidence: captured.confidence,
						capturedAt: captured.timestamp,
						status: "completed",
					},
				});
				if (modeRef.current !== "FACE_CAPTURE") {
					return;
				}
				setMode("PROCTORING");
				toast.success("Face captured");
			} catch (error) {
				console.error("Face capture: upload failed", error);
				faceContextSentRef.current = false;
				faceCaptureCommittedRef.current = false;
				if (modeRef.current !== "FACE_CAPTURE") {
					return;
				}
				const detail =
					error instanceof Error && error.message.trim()
						? error.message.trim()
						: null;
				setFaceCaptureError(
					detail
						? `We could not upload your photo: ${detail}`
						: "We could not upload your photo. Please try again.",
				);
				setFaceCaptureStatus("failed");
			} finally {
				faceSubmitInFlightRef.current = false;
			}
		},
		[room, setMode],
	);

	// Detectors only depend on model-level options, so check tuning doesn't reload them.
	const {
		wasmBaseUrl,
		faceModelUrl,
		objectModelUrl,
		faceConfidence,
		maxFaces,
	} = config;

	useEffect(() => {
		if (!active || !videoTrack) {
			return;
		}

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let detectors: Detectors | undefined;
		const checkStates = new Map<ProctoringViolation, CheckState>();
		const video = attachHiddenVideo(videoTrack, "Proctoring");

		const evaluate = (
			type: ProctoringViolation,
			check: ProctoringCheckConfig,
			violated: boolean,
			now: number,
			details: Record<string, unknown> = {},
		) => {
			const state = checkStates.get(type) ?? {
				since: null,
				lastReportedAt: Number.NEGATIVE_INFINITY,
			};
			checkStates.set(type, state);

			if (!check.enabled || !violated) {
				state.since = null;
				return;
			}
			state.since ??= now;
			if (
				now - state.since < check.minDurationMs ||
				now - state.lastReportedAt < check.cooldownMs
			) {
				return;
			}

			state.lastReportedAt = now;
			toast.warning(check.title, {
				id: `proctoring-${type}`,
				description: check.message,
			});
			void sendContext(room, {
				state: check.message,
				action: check.action,
				type,
				details,
			});
		};

		const tick = () => {
			if (cancelled || !detectors) {
				return;
			}
			const cfg = configRef.current;

			if (modeRef.current !== "PROCTORING") {
				// Holding a card up to the camera would trip every check, so skip inference and forget
				// any in-progress violations; they start fresh once capture ends.
				checkStates.clear();
			} else if (isVideoReady(video)) {
				try {
					const obs = observe(detectors, video, cfg);
					const now = Date.now();
					const { checks } = cfg;

					evaluate(
						"multiple_people",
						checks.multiplePeople,
						obs.faceCount > 1 || obs.personCount > 1,
						now,
						{ faces: obs.faceCount, people: obs.personCount },
					);
					evaluate(
						"additional_device",
						checks.additionalDevice,
						obs.devices.length > 0,
						now,
						{
							devices: [...new Set(obs.devices)],
						},
					);
					evaluate(
						"no_face",
						checks.facePresent,
						obs.faceCount === 0,
						now,
					);
					// Gaze is only meaningful for a single, visible candidate.
					evaluate(
						"gaze_away",
						checks.gaze,
						obs.faceCount === 1 && obs.gazeAway,
						now,
					);
				} catch (error) {
					console.error("Proctoring: frame analysis failed", error);
				}
			}

			timer = setTimeout(tick, cfg.intervalMs);
		};

		createDetectors({
			...configRef.current,
			wasmBaseUrl,
			faceModelUrl,
			objectModelUrl,
			faceConfidence,
			maxFaces,
		})
			.then((created) => {
				if (cancelled) {
					created.face.close();
					created.objects.close();
					return;
				}
				detectors = created;
				tick();
			})
			.catch((error) =>
				console.error(
					"Proctoring: failed to load MediaPipe models",
					error,
				),
			);

		return () => {
			cancelled = true;
			clearTimeout(timer);
			videoTrack.detach(video);
			detectors?.face.close();
			detectors?.objects.close();
		};
	}, [
		active,
		videoTrack,
		room,
		wasmBaseUrl,
		faceModelUrl,
		objectModelUrl,
		faceConfidence,
		maxFaces,
	]);

	// ID capture loop. Reuses the published camera track rather than opening a second stream.
	useEffect(() => {
		if (
			!active ||
			!videoTrack ||
			mode !== "ID_CAPTURE" ||
			idCaptureStatus !== "scanning"
		) {
			return;
		}

		let cancelled = false;
		let capturing = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const video = attachHiddenVideo(videoTrack, "ID capture");
		const detect = createIdCardDetector();
		const startedAt = Date.now();
		// Only capture once the card has been good and still for several frames in a row, so a
		// card swept past the camera or caught mid-motion isn't submitted.
		let stableFrames = 0;
		let lastBox: NormalizedRect | null = null;

		const tick = async () => {
			if (cancelled || capturing) {
				return;
			}
			const cfg = configRef.current.idCapture;

			if (Date.now() - startedAt > cfg.timeoutMs) {
				setIdCaptureError(
					"We could not get a clear photo of your ID. Please try again.",
				);
				setIdCaptureStatus("failed");
				return;
			}

			if (isVideoReady(video)) {
				try {
					const detection = detect(video, cfg);
					const stable =
						lastBox !== null &&
						detection.box !== null &&
						boxDelta(lastBox, detection.box) <=
							cfg.stabilityTolerance;
					stableFrames = detection.detected
						? stable
							? stableFrames + 1
							: 1
						: 0;
					lastBox = detection.box;
					setIdDetection(detection);

					if (
						stableFrames >= cfg.requiredStableFrames &&
						detection.box
					) {
						capturing = true;
						const captured = await captureIdCard(
							video,
							{ ...detection, box: detection.box },
							cfg,
						);
						if (cancelled) {
							return;
						}
						setIdCapture(captured);
						setIdCaptureStatus("uploading");
						void submitIdCapture(captured);
						return;
					}
				} catch (error) {
					capturing = false;
					console.error("ID capture: frame analysis failed", error);
				}
			}

			timer = setTimeout(tick, cfg.intervalMs);
		};

		void tick();

		return () => {
			cancelled = true;
			clearTimeout(timer);
			videoTrack.detach(video);
		};
	}, [active, videoTrack, mode, idCaptureStatus, submitIdCapture]);

	// Face capture loop. Uses a dedicated FaceLandmarker so it doesn't contend with proctoring.
	useEffect(() => {
		if (
			!active ||
			!videoTrack ||
			mode !== "FACE_CAPTURE" ||
			faceCaptureStatus !== "scanning"
		) {
			return;
		}

		let cancelled = false;
		let capturing = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let faceLandmarker: FaceLandmarker | undefined;
		const video = attachHiddenVideo(videoTrack, "Face capture");
		const startedAt = Date.now();
		let stableFrames = 0;
		let lastBox: NormalizedRect | null = null;

		const tick = async () => {
			if (cancelled || capturing || !faceLandmarker) {
				return;
			}
			const cfg = configRef.current.faceCapture;

			if (Date.now() - startedAt > cfg.timeoutMs) {
				setFaceCaptureError(
					"We could not get a clear photo of your face. Please try again.",
				);
				setFaceCaptureStatus("failed");
				return;
			}

			if (isVideoReady(video)) {
				try {
					const result = faceLandmarker.detectForVideo(
						video,
						performance.now(),
					);
					const detection = evaluateFaceFraming(
						result,
						video.videoWidth,
						video.videoHeight,
						cfg,
					);
					const stable =
						lastBox !== null &&
						detection.box !== null &&
						faceBoxDelta(lastBox, detection.box) <=
							cfg.stabilityTolerance;
					stableFrames = detection.detected
						? stable
							? stableFrames + 1
							: 1
						: 0;
					lastBox = detection.box;
					setFaceDetection(detection);

					if (
						stableFrames >= cfg.requiredStableFrames &&
						detection.box
					) {
						if (
							faceCaptureCommittedRef.current ||
							faceSubmitInFlightRef.current ||
							faceContextSentRef.current
						) {
							return;
						}
						faceCaptureCommittedRef.current = true;
						capturing = true;
						const captured = await captureFace(
							video,
							{ ...detection, box: detection.box },
							cfg,
						);
						if (cancelled) {
							faceCaptureCommittedRef.current = false;
							return;
						}
						setFaceCapture(captured);
						setFaceCaptureStatus("uploading");
						void submitFaceCapture(captured);
						return;
					}
				} catch (error) {
					capturing = false;
					console.error("Face capture: frame analysis failed", error);
				}
			}

			timer = setTimeout(tick, cfg.intervalMs);
		};

		void (async () => {
			try {
				const { FilesetResolver, FaceLandmarker } = await import(
					"@mediapipe/tasks-vision"
				);
				const cfg = configRef.current;
				const vision = await FilesetResolver.forVisionTasks(
					cfg.wasmBaseUrl,
				);
				const create = (delegate: "GPU" | "CPU") =>
					FaceLandmarker.createFromOptions(vision, {
						baseOptions: {
							modelAssetPath: cfg.faceModelUrl,
							delegate,
						},
						runningMode: "VIDEO",
						numFaces: 2,
						minFaceDetectionConfidence: cfg.faceConfidence,
						minFacePresenceConfidence: cfg.faceConfidence,
					});
				try {
					faceLandmarker = await create("GPU");
				} catch {
					faceLandmarker = await create("CPU");
				}
				if (cancelled) {
					faceLandmarker.close();
					return;
				}
				void tick();
			} catch (error) {
				console.error("Face capture: failed to load model", error);
				if (!cancelled) {
					setFaceCaptureError(
						"Face capture could not start. Please try again.",
					);
					setFaceCaptureStatus("failed");
				}
			}
		})();

		return () => {
			cancelled = true;
			clearTimeout(timer);
			videoTrack.detach(video);
			faceLandmarker?.close();
		};
	}, [active, videoTrack, mode, faceCaptureStatus, submitFaceCapture]);

	// Lets the agent ask for the candidate's ID, e.g. from a `verify_identity` tool.
	useEffect(() => {
		if (!enabled || !idVerification) {
			return;
		}

		try {
			room.registerRpcMethod(START_ID_CAPTURE_RPC, async () => {
				startIdCapture();
				return JSON.stringify({ started: true });
			});
		} catch (error) {
			console.warn(
				`${START_ID_CAPTURE_RPC} RPC already registered`,
				error,
			);
			return;
		}
		return () => room.unregisterRpcMethod(START_ID_CAPTURE_RPC);
	}, [room, enabled, idVerification, startIdCapture]);

	// Lets the agent ask for the candidate's face, e.g. from a `verify_face` tool.
	useEffect(() => {
		if (!enabled || !faceVerification) {
			return;
		}

		try {
			room.registerRpcMethod(START_FACE_CAPTURE_RPC, async () => {
				startFaceCapture();
				return JSON.stringify({ started: true });
			});
		} catch (error) {
			console.warn(
				`${START_FACE_CAPTURE_RPC} RPC already registered`,
				error,
			);
			return;
		}
		return () => room.unregisterRpcMethod(START_FACE_CAPTURE_RPC);
	}, [room, enabled, faceVerification, startFaceCapture]);

	return {
		config,
		mode,
		isCameraReady: active,
		isProctoringPaused: mode !== "PROCTORING",
		isIdCaptureActive: mode === "ID_CAPTURE",
		isFaceCaptureActive: mode === "FACE_CAPTURE",
		idCaptureStatus,
		idCaptureError,
		idDetection,
		idCapture,
		startIdCapture,
		cancelIdCapture,
		faceCaptureStatus,
		faceCaptureError,
		faceDetection,
		faceCapture,
		startFaceCapture,
		cancelFaceCapture,
	};
}

export type ProctoringState = ReturnType<typeof useProctoring>;

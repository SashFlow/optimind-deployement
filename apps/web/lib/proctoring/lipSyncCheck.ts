import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** Upper / lower inner lip landmarks (MediaPipe Face Mesh). */
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;

export type MicAnalyser = {
	/** RMS-like level in 0..1 */
	level: () => number;
	close: () => void;
};

/**
 * Attach a Web Audio analyser to a local microphone MediaStreamTrack.
 * Returns null when AudioContext / track is unavailable.
 */
export function createMicAnalyser(
	track: MediaStreamTrack | null | undefined,
): MicAnalyser | null {
	if (!track || track.readyState !== "live") {
		return null;
	}
	try {
		const AudioCtx =
			window.AudioContext ||
			(
				window as unknown as {
					webkitAudioContext?: typeof AudioContext;
				}
			).webkitAudioContext;
		if (!AudioCtx) {
			return null;
		}
		const ctx = new AudioCtx();
		const stream = new MediaStream([track]);
		const source = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 512;
		analyser.smoothingTimeConstant = 0.6;
		source.connect(analyser);
		const buffer = new Float32Array(analyser.fftSize);

		return {
			level: () => {
				analyser.getFloatTimeDomainData(buffer);
				let sum = 0;
				for (let i = 0; i < buffer.length; i++) {
					const sample = buffer[i] ?? 0;
					sum += sample * sample;
				}
				const rms = Math.sqrt(sum / Math.max(buffer.length, 1));
				// Typical speech sits ~0.02–0.15; compress into 0..1.
				return Math.min(1, rms * 8);
			},
			close: () => {
				try {
					source.disconnect();
					analyser.disconnect();
					void ctx.close();
				} catch {
					// ignore
				}
			},
		};
	} catch (error) {
		console.warn("Mic analyser unavailable", error);
		return null;
	}
}

/** Normalised mouth openness (lip gap relative to mouth width). */
export function mouthOpennessFromLandmarks(
	landmarks: NormalizedLandmark[],
): number {
	const upper = landmarks[UPPER_LIP];
	const lower = landmarks[LOWER_LIP];
	const left = landmarks[MOUTH_LEFT];
	const right = landmarks[MOUTH_RIGHT];
	if (!upper || !lower || !left || !right) {
		return 0;
	}
	const gap = Math.hypot(upper.x - lower.x, upper.y - lower.y);
	const width = Math.hypot(left.x - right.x, left.y - right.y);
	if (width < 1e-4) {
		return 0;
	}
	return gap / width;
}

export type LipSyncState = {
	/** Consecutive ticks where mic is active but mouth is still. */
	mismatchMs: number;
	lastMouth: number;
	lastMic: number;
};

export type LipSyncConfig = {
	/** Mic level above this counts as speaking (0–1). */
	micSpeakThreshold: number;
	/** Mouth openness above this counts as moving (gap/width). */
	mouthMoveThreshold: number;
	/** How long mismatch must persist before reporting (ms). */
	minMismatchMs: number;
	/** Cooldown between reports (ms). */
	cooldownMs: number;
};

export const DEFAULT_LIP_SYNC_CONFIG: LipSyncConfig = {
	micSpeakThreshold: 0.08,
	mouthMoveThreshold: 0.035,
	minMismatchMs: 2_500,
	cooldownMs: 30_000,
};

/**
 * Update rolling lip-sync state. Returns true when a mismatch should be reported.
 */
export function evaluateLipSyncMismatch(
	state: LipSyncState,
	opts: {
		micLevel: number;
		mouthOpenness: number;
		deltaMs: number;
		config?: Partial<LipSyncConfig>;
		now?: number;
		lastReportedAt?: number;
	},
): { mismatch: boolean; state: LipSyncState; lastReportedAt: number } {
	const config = { ...DEFAULT_LIP_SYNC_CONFIG, ...opts.config };
	const now = opts.now ?? Date.now();
	const lastReportedAt = opts.lastReportedAt ?? Number.NEGATIVE_INFINITY;

	const speaking = opts.micLevel >= config.micSpeakThreshold;
	const mouthMoving = opts.mouthOpenness >= config.mouthMoveThreshold;
	// Also treat rapid mouth delta as movement.
	const mouthDelta = Math.abs(opts.mouthOpenness - state.lastMouth);
	const activeMouth =
		mouthMoving || mouthDelta >= config.mouthMoveThreshold * 0.5;

	let mismatchMs = state.mismatchMs;
	if (speaking && !activeMouth) {
		mismatchMs += opts.deltaMs;
	} else {
		mismatchMs = 0;
	}

	const next: LipSyncState = {
		mismatchMs,
		lastMouth: opts.mouthOpenness,
		lastMic: opts.micLevel,
	};

	const shouldReport =
		mismatchMs >= config.minMismatchMs &&
		now - lastReportedAt >= config.cooldownMs;

	return {
		mismatch: shouldReport,
		state: shouldReport ? { ...next, mismatchMs: 0 } : next,
		lastReportedAt: shouldReport ? now : lastReportedAt,
	};
}

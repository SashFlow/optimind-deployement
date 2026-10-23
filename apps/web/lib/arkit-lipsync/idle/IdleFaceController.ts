import { SPEECH_BLENDSHAPE_SET, clamp01, type ARKitBlendshape } from "../arkit";

export interface IdleFaceResult {
	/** Expression-layer blendshape weights (never includes speech/mouth channels). */
	weights: Partial<Record<ARKitBlendshape, number>>;
	/** Additive neck pitch in degrees (positive = look up). */
	neckPitchDeg: number;
	/** Additive neck yaw in degrees (positive = turn left). */
	neckYawDeg: number;
	/** Additive neck roll in degrees. */
	neckRollDeg: number;
	/** Breathing phase, 0 (exhaled) → 1 (inhaled). */
	breath: number;
}

interface BlinkPhase {
	/** Absolute time when this blink started closing. */
	start: number;
	closeDuration: number;
	openDuration: number;
	/** Offset applied to the right eye (seconds). */
	rightDelay: number;
	/** If set, a second blink starts at this time (double-blink). */
	doubleAt: number | null;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function smoothstep(t: number): number {
	const x = clamp01(t);
	return x * x * (3 - 2 * x);
}

/** Envelope for one eye: 0 → 1 (closed) → 0 over close+open. */
function blinkEnvelope(
	elapsed: number,
	closeDur: number,
	openDur: number,
): number {
	if (elapsed < 0) return 0;
	if (elapsed < closeDur) return smoothstep(elapsed / closeDur);
	const openT = elapsed - closeDur;
	if (openT < openDur) return 1 - smoothstep(openT / openDur);
	return 0;
}

/**
 * Human-like passive face motion: blinks, gaze drift, micro-expressions, and
 * subtle neck sway. Output is intended for the engine expression layer and
 * must not drive speech/mouth blendshapes.
 */
export class IdleFaceController {
	private nextBlinkAt: number;
	private blink: BlinkPhase | null = null;
	private started = false;
	private startTime = 0;

	private gazeCurrent = { up: 0, down: 0, in: 0, out: 0 };
	private gazeTarget = { up: 0, down: 0, in: 0, out: 0 };
	private nextGazeAt = 0;

	/** Slow head look-around targets (degrees), eased each frame. */
	private headCurrent = { pitch: 0, yaw: 0, roll: 0 };
	private headTarget = { pitch: 0, yaw: 0, roll: 0 };
	private nextHeadAt = 0;

	/** Brow pose targets (0–1 ARKit weights), eased each frame. */
	private browCurrent = {
		innerUp: 0.05,
		outerUpL: 0.03,
		outerUpR: 0.03,
		downL: 0,
		downR: 0,
	};
	private browTarget = {
		innerUp: 0.05,
		outerUpL: 0.03,
		outerUpR: 0.03,
		downL: 0,
		downR: 0,
	};
	private nextBrowAt = 0;

	private readonly browPhase: number;
	private readonly cheekPhase: number;
	private readonly nosePhase: number;
	private readonly neckPitchPhase: number;
	private readonly neckYawPhase: number;
	private readonly neckRollPhase: number;

	constructor(private readonly rng: () => number = Math.random) {
		this.nextBlinkAt = 0;
		this.browPhase = this.rng() * Math.PI * 2;
		this.cheekPhase = this.rng() * Math.PI * 2;
		this.nosePhase = this.rng() * Math.PI * 2;
		this.neckPitchPhase = this.rng() * Math.PI * 2;
		this.neckYawPhase = this.rng() * Math.PI * 2;
		this.neckRollPhase = this.rng() * Math.PI * 2;
	}

	update(nowSeconds: number): IdleFaceResult {
		if (!this.started) {
			this.started = true;
			this.startTime = nowSeconds;
			this.nextBlinkAt = nowSeconds + this.randomInterval(1.5, 3.5);
			this.nextGazeAt = nowSeconds + this.randomInterval(0.4, 2);
			this.nextHeadAt = nowSeconds + this.randomInterval(2.5, 5);
			this.nextBrowAt = nowSeconds + this.randomInterval(2, 4);
			this.pickGazeTarget();
			this.pickHeadTarget();
			this.pickBrowTarget();
		}

		const t = nowSeconds - this.startTime;
		this.advanceBlink(nowSeconds);
		this.advanceGaze(nowSeconds);
		this.advanceHead(nowSeconds);
		this.advanceBrow(nowSeconds);

		const weights: Partial<Record<ARKitBlendshape, number>> = {};

		// --- Blinks ---
		const { left, right } = this.blinkWeights(nowSeconds);
		if (left > 1e-4) weights.eyeBlinkLeft = left;
		if (right > 1e-4) weights.eyeBlinkRight = right;

		// --- Gaze (mutually exclusive opposing directions) ---
		const drift = this.gazeDrift(t);
		const g = {
			up: this.gazeCurrent.up + drift.up,
			down: this.gazeCurrent.down + drift.down,
			in: this.gazeCurrent.in + drift.in,
			out: this.gazeCurrent.out + drift.out,
		};
		if (g.up > 1e-4) {
			weights.eyeLookUpLeft = g.up;
			weights.eyeLookUpRight = g.up;
		}
		if (g.down > 1e-4) {
			weights.eyeLookDownLeft = g.down;
			weights.eyeLookDownRight = g.down;
		}
		if (g.in > 1e-4) {
			weights.eyeLookInLeft = g.in;
			weights.eyeLookInRight = g.in;
		}
		if (g.out > 1e-4) {
			weights.eyeLookOutLeft = g.out;
			weights.eyeLookOutRight = g.out;
		}

		// --- Eyebrows: pose targets + micro-sway + slight lift with blinks ---
		const browSway = 0.5 + 0.5 * Math.sin(t * 0.4 + this.browPhase);
		const browAsym = 0.5 + 0.5 * Math.sin(t * 0.55 + this.browPhase + 1.1);
		const blinkLift = Math.max(left, right) * 0.1; // brows ease up a touch during blinks

		const browInner =
			this.browCurrent.innerUp + 0.04 * browSway + blinkLift;
		const browOuterL =
			this.browCurrent.outerUpL + 0.03 * browSway + 0.02 * browAsym;
		const browOuterR =
			this.browCurrent.outerUpR + 0.03 * browSway + 0.02 * (1 - browAsym);
		const browDownL = this.browCurrent.downL;
		const browDownR = this.browCurrent.downR;

		weights.browInnerUp = clamp01(browInner);
		weights.browOuterUpLeft = clamp01(browOuterL);
		weights.browOuterUpRight = clamp01(browOuterR);
		if (browDownL > 1e-4) weights.browDownLeft = clamp01(browDownL);
		if (browDownR > 1e-4) weights.browDownRight = clamp01(browDownR);

		// --- Cheeks / nose micro-expressions ---
		const cheek =
			0.03 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.22 + this.cheekPhase));
		weights.cheekSquintLeft = clamp01(cheek);
		weights.cheekSquintRight = clamp01(
			cheek * (0.95 + 0.05 * Math.sin(t * 0.5)),
		);

		const nosePulse = 0.5 + 0.5 * Math.sin(t * 0.15 + this.nosePhase);
		if (nosePulse > 0.85) {
			const n = ((nosePulse - 0.85) / 0.15) * 0.06;
			weights.noseSneerLeft = clamp01(n);
			weights.noseSneerRight = clamp01(n * 0.85);
		}

		// Soften lids slightly with blink so squint doesn't fight a full close
		if (left > 0.5) {
			weights.eyeSquintLeft = Math.max(
				weights.eyeSquintLeft ?? 0,
				left * 0.15,
			);
		}
		if (right > 0.5) {
			weights.eyeSquintRight = Math.max(
				weights.eyeSquintRight ?? 0,
				right * 0.15,
			);
		}

		// Safety: never emit speech channels
		for (const key of Object.keys(weights) as ARKitBlendshape[]) {
			if (SPEECH_BLENDSHAPE_SET.has(key)) delete weights[key];
		}

		// --- Neck: intentional look-around + continuous micro-sway ---
		const swayPitch =
			Math.sin(t * 0.45 + this.neckPitchPhase) * 2.0 +
			Math.sin(t * 0.19 + this.neckPitchPhase * 0.5) * 0.7;
		const swayYaw =
			Math.sin(t * 0.33 + this.neckYawPhase) * 2.6 +
			Math.sin(t * 0.12 + this.neckYawPhase * 0.7) * 0.9;
		const swayRoll =
			Math.sin(t * 0.27 + this.neckRollPhase) * 1.5 +
			Math.sin(t * 0.14 + this.neckRollPhase * 0.6) * 0.5;

		const neckPitchDeg = this.headCurrent.pitch + swayPitch;
		const neckYawDeg = this.headCurrent.yaw + swayYaw;
		const neckRollDeg = this.headCurrent.roll + swayRoll;

		const breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.25);

		return { weights, neckPitchDeg, neckYawDeg, neckRollDeg, breath };
	}

	private advanceBlink(now: number): void {
		if (this.blink) {
			const b = this.blink;
			const end =
				b.start +
				Math.max(
					b.closeDuration + b.openDuration,
					b.rightDelay + b.closeDuration + b.openDuration,
				) +
				(b.doubleAt !== null
					? b.closeDuration + b.openDuration + 0.08
					: 0);
			if (now >= end) {
				this.blink = null;
				this.nextBlinkAt = now + this.randomInterval(3, 5);
			}
			return;
		}

		if (now >= this.nextBlinkAt) {
			const closeDuration = lerp(0.08, 0.12, this.rng());
			const openDuration = lerp(0.15, 0.2, this.rng());
			// Lids close together; keep any inter-eye offset below ~10 ms.
			const rightDelay =
				lerp(0, 0.01, this.rng()) * (this.rng() < 0.5 ? 1 : -1);
			const doubleBlink = this.rng() < 0.12;
			this.blink = {
				start: now,
				closeDuration,
				openDuration,
				rightDelay,
				doubleAt: doubleBlink
					? now +
						closeDuration +
						openDuration +
						lerp(0.06, 0.12, this.rng())
					: null,
			};
		}
	}

	private blinkWeights(now: number): { left: number; right: number } {
		if (!this.blink) return { left: 0, right: 0 };
		const b = this.blink;
		let left = blinkEnvelope(
			now - b.start,
			b.closeDuration,
			b.openDuration,
		);
		let right = blinkEnvelope(
			now - b.start - b.rightDelay,
			b.closeDuration,
			b.openDuration,
		);

		if (b.doubleAt !== null && now >= b.doubleAt) {
			left = Math.max(
				left,
				blinkEnvelope(
					now - b.doubleAt,
					b.closeDuration,
					b.openDuration,
				),
			);
			right = Math.max(
				right,
				blinkEnvelope(
					now - b.doubleAt - b.rightDelay,
					b.closeDuration,
					b.openDuration,
				),
			);
		}

		return { left: clamp01(left), right: clamp01(right) };
	}

	private advanceGaze(now: number): void {
		if (now >= this.nextGazeAt) {
			this.pickGazeTarget();
			this.nextGazeAt = now + this.randomInterval(0.4, 2);
		}
		// Saccade: eyes snap to the target within a few frames
		const k = 0.4;
		this.gazeCurrent.up = lerp(this.gazeCurrent.up, this.gazeTarget.up, k);
		this.gazeCurrent.down = lerp(
			this.gazeCurrent.down,
			this.gazeTarget.down,
			k,
		);
		this.gazeCurrent.in = lerp(this.gazeCurrent.in, this.gazeTarget.in, k);
		this.gazeCurrent.out = lerp(
			this.gazeCurrent.out,
			this.gazeTarget.out,
			k,
		);
	}

	private pickGazeTarget(): void {
		// Pick one primary axis with small amplitude
		const axis = this.rng();
		const amp = lerp(0.03, 0.1, this.rng());
		this.gazeTarget = { up: 0, down: 0, in: 0, out: 0 };
		if (axis < 0.25) this.gazeTarget.up = amp;
		else if (axis < 0.5) this.gazeTarget.down = amp;
		else if (axis < 0.75) this.gazeTarget.in = amp;
		else this.gazeTarget.out = amp;

		// Bias toward the viewer: often return to center
		if (this.rng() < 0.5) {
			this.gazeTarget = { up: 0, down: 0, in: 0, out: 0 };
		}
	}

	/** Tiny continuous eye drift between saccades (non-negative per axis). */
	private gazeDrift(t: number): {
		up: number;
		down: number;
		in: number;
		out: number;
	} {
		const a = Math.sin(t * 1.7 + this.browPhase) * 0.012;
		const b = Math.sin(t * 1.3 + this.cheekPhase) * 0.012;
		return {
			up: Math.max(0, a),
			down: Math.max(0, -a),
			in: Math.max(0, b),
			out: Math.max(0, -b),
		};
	}

	private advanceHead(now: number): void {
		if (now >= this.nextHeadAt) {
			this.pickHeadTarget();
			this.nextHeadAt = now + this.randomInterval(3, 7);
		}
		// Slow ease — head turns take ~1–2s to settle
		const k = 0.025;
		this.headCurrent.pitch = lerp(
			this.headCurrent.pitch,
			this.headTarget.pitch,
			k,
		);
		this.headCurrent.yaw = lerp(
			this.headCurrent.yaw,
			this.headTarget.yaw,
			k,
		);
		this.headCurrent.roll = lerp(
			this.headCurrent.roll,
			this.headTarget.roll,
			k,
		);
	}

	private pickHeadTarget(): void {
		// Often return toward center; otherwise look slightly aside / up / down
		if (this.rng() < 0.35) {
			this.headTarget = { pitch: 0, yaw: 0, roll: 0 };
			return;
		}

		const yaw = (this.rng() * 2 - 1) * lerp(4, 12, this.rng());
		const pitch = (this.rng() * 2 - 1) * lerp(2, 6, this.rng());
		const roll = (this.rng() * 2 - 1) * lerp(1, 5, this.rng());
		this.headTarget = { pitch, yaw, roll };
	}

	private advanceBrow(now: number): void {
		if (now >= this.nextBrowAt) {
			this.pickBrowTarget();
			this.nextBrowAt = now + this.randomInterval(2.5, 6);
		}
		const k = 0.04;
		this.browCurrent.innerUp = lerp(
			this.browCurrent.innerUp,
			this.browTarget.innerUp,
			k,
		);
		this.browCurrent.outerUpL = lerp(
			this.browCurrent.outerUpL,
			this.browTarget.outerUpL,
			k,
		);
		this.browCurrent.outerUpR = lerp(
			this.browCurrent.outerUpR,
			this.browTarget.outerUpR,
			k,
		);
		this.browCurrent.downL = lerp(
			this.browCurrent.downL,
			this.browTarget.downL,
			k,
		);
		this.browCurrent.downR = lerp(
			this.browCurrent.downR,
			this.browTarget.downR,
			k,
		);
	}

	private pickBrowTarget(): void {
		const roll = this.rng();

		// Neutral resting brows
		if (roll < 0.28) {
			this.browTarget = {
				innerUp: 0.04,
				outerUpL: 0.02,
				outerUpR: 0.02,
				downL: 0,
				downR: 0,
			};
			return;
		}

		// Soft raise (curiosity / interest)
		if (roll < 0.55) {
			const up = lerp(0.05, 0.12, this.rng());
			const outer = up * lerp(0.5, 0.9, this.rng());
			this.browTarget = {
				innerUp: up,
				outerUpL: outer,
				outerUpR: outer * lerp(0.85, 1.1, this.rng()),
				downL: 0,
				downR: 0,
			};
			return;
		}

		// Asymmetric raise (one brow)
		if (roll < 0.75) {
			const leftHigh = this.rng() < 0.5;
			const high = lerp(0.06, 0.1, this.rng());
			const low = lerp(0.02, 0.05, this.rng());
			this.browTarget = {
				innerUp: lerp(0.04, 0.1, this.rng()),
				outerUpL: leftHigh ? high : low,
				outerUpR: leftHigh ? low : high,
				downL: 0,
				downR: 0,
			};
			return;
		}

		// Light furrow / concern (brow down + a little inner up)
		const down = lerp(0.05, 0.12, this.rng());
		this.browTarget = {
			innerUp: lerp(0.04, 0.1, this.rng()),
			outerUpL: lerp(0.01, 0.06, this.rng()),
			outerUpR: lerp(0.01, 0.06, this.rng()),
			downL: down,
			downR: down * lerp(0.85, 1.05, this.rng()),
		};
	}

	private randomInterval(min: number, max: number): number {
		return lerp(min, max, this.rng());
	}
}

import {
	composeGatedKeyframe,
	DEFAULT_ARKIT_FLAME_FILTER,
	emptyRestKeyframe,
	SoftSpeechGate,
	type ArkitFlameFilterParams,
} from "./filter";
import type { FlameKeyframe } from "./flame";
import {
	arkitSpeechEnergy,
	ArkitWeightRing,
	extractArkitRow,
	matVec,
	type Arkit2FlameModel,
} from "./model";

export type ArkitFlameProcessorOptions = {
	model: Arkit2FlameModel;
	params?: Partial<ArkitFlameFilterParams>;
};

/**
 * Causal ARKit→FLAME converter for real-time / LiveKit use.
 *
 * Each `push` stores the latest 52 ARKit weights, builds an edge-padded
 * temporal window (lag-compensated), runs the fitted matrix, then applies
 * SoftSpeechGate (attack/release/hold) + jaw scale + slew.
 */
export class ArkitFlameProcessor {
	private readonly model: Arkit2FlameModel;
	private readonly params: ArkitFlameFilterParams;
	private readonly gate: SoftSpeechGate;
	private readonly ring: ArkitWeightRing;
	private prevJaw0: number;

	constructor(options: ArkitFlameProcessorOptions) {
		this.model = options.model;
		this.params = {
			...DEFAULT_ARKIT_FLAME_FILTER,
			...options.params,
		};
		this.gate = new SoftSpeechGate(this.params);
		const R = this.model.temporalRadius;
		const lag = Math.max(0, Math.floor(this.params.lagFrames));
		// Keep enough history for lag + full temporal window (2R+1).
		this.ring = new ArkitWeightRing(Math.max(2 * R + 1 + lag, 8));
		this.prevJaw0 = this.model.rest[100];
	}

	reset(): void {
		this.gate.reset();
		this.ring.clear();
		this.prevJaw0 = this.model.rest[100];
	}

	get filterParams(): Readonly<ArkitFlameFilterParams> {
		return this.params;
	}

	/**
	 * Push current 52 ARKit weights; returns gated expression+jaw keyframe.
	 * Missing future temporal frames are edge-padded (slightly softer than offline bake).
	 */
	push(weights: ArrayLike<number>, dtSec: number): FlameKeyframe {
		this.ring.push(weights);

		const rms = arkitSpeechEnergy(weights);
		const g = this.gate.step(rms, Math.max(1e-4, dtSec));

		const R = this.model.temporalRadius;
		const lag = Math.max(0, Math.floor(this.params.lagFrames));
		const windowSize = R > 0 ? 2 * R + 1 : 1;
		const history = this.ring.windowEndingAtLag(windowSize, lag);
		if (!history.length) {
			return emptyRestKeyframe(this.model);
		}

		let raw: Float32Array;
		if (R <= 0) {
			raw = matVec(
				this.model.matrix,
				this.model.rows,
				this.model.cols,
				extractArkitRow(history[history.length - 1]),
			);
		} else {
			const stacked = new Float32Array(this.model.rows);
			for (let i = 0; i < windowSize; i++) {
				stacked.set(
					extractArkitRow(history[i]),
					i * this.model.arkitChannels,
				);
			}
			raw = matVec(
				this.model.matrix,
				this.model.rows,
				this.model.cols,
				stacked,
			);
		}

		const { keyframe, jaw0 } = composeGatedKeyframe(
			raw,
			this.model,
			g,
			this.params.jawScale,
			this.prevJaw0,
			this.params.jawSlewPerFrame,
		);
		this.prevJaw0 = jaw0;
		return keyframe;
	}
}

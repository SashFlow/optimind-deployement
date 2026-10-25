import { ARKIT_BLENDSHAPES, ARKIT_INDEX, SPEECH_BLENDSHAPE_SET } from "./arkit";
import { normalizeKeyframe, zeroKeyframe, type FlameKeyframe } from "./flame";
import {
	ARKIT2FLAME_CHANNELS,
	ARKIT2FLAME_ROWS,
	arkitSpeechEnergy,
	DEFAULT_ARKIT_LAG_FRAMES,
	matVec,
	type Arkit2FlameModel,
} from "./model";

/**
 * Temporal priors for ARKit→FLAME (zero-phase when the full clip is known).
 * Tuned by leave-clip-out grid search → assets/arkit2flame-filter.json
 */
export type ArkitFlameFilterParams = {
	/** Gaussian σ on ARKit weights (frames @ fps). */
	sigmaFrames: number;
	/** Soft gate smoothstep low / high on speech RMS. */
	gateLo: number;
	gateHi: number;
	/** Asymmetric gate time constants (seconds). */
	attackSec: number;
	releaseSec: number;
	/** Keep gate high this long after speech drops (seconds). */
	holdSec: number;
	/** Applied to jaw *delta* after matrix + gate. */
	jawScale: number;
	/** Max |Δjaw0| per frame. */
	jawSlewPerFrame: number;
	/** Optional light zero-phase σ on jaw delta before scale/slew (0 = off). */
	postJawSigmaFrames: number;
	fps: number;
	/** Align with legacy lag compensation (frames). */
	lagFrames: number;
};

/** Defaults match leave-clip-out winner in arkit2flame-filter.json. */
export const DEFAULT_ARKIT_FLAME_FILTER: ArkitFlameFilterParams = {
	sigmaFrames: 0.75,
	gateLo: 0.01,
	gateHi: 0.03,
	attackSec: 0.04,
	releaseSec: 0.15,
	holdSec: 0.08,
	jawScale: 2.15,
	jawSlewPerFrame: 0.028,
	postJawSigmaFrames: 0.35,
	fps: 25,
	lagFrames: DEFAULT_ARKIT_LAG_FRAMES,
};

export function pickFilterParams(
	src: Partial<ArkitFlameFilterParams>,
): Partial<ArkitFlameFilterParams> {
	const out: Partial<ArkitFlameFilterParams> = {};
	for (const key of Object.keys(
		DEFAULT_ARKIT_FLAME_FILTER,
	) as (keyof ArkitFlameFilterParams)[]) {
		const v = src[key];
		if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
	}
	return out;
}

export function parseArkitFlameFilter(
	json: Partial<ArkitFlameFilterParams> & {
		best?: Partial<ArkitFlameFilterParams>;
	},
): ArkitFlameFilterParams {
	const src = json.best ?? json;
	return { ...DEFAULT_ARKIT_FLAME_FILTER, ...pickFilterParams(src) };
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	if (edge0 === edge1) return x < edge0 ? 0 : 1;
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}

/** One-pole asymmetric approach toward target. */
export function arApproach(
	prev: number,
	target: number,
	dtSec: number,
	attackSec: number,
	releaseSec: number,
): number {
	const tau =
		target > prev ? Math.max(1e-4, attackSec) : Math.max(1e-4, releaseSec);
	const a = 1 - Math.exp(-dtSec / tau);
	return prev + (target - prev) * a;
}

export function slewLimit(
	prev: number,
	next: number,
	maxDelta: number,
): number {
	const d = next - prev;
	if (d > maxDelta) return prev + maxDelta;
	if (d < -maxDelta) return prev - maxDelta;
	return next;
}

/**
 * Zero-phase Gaussian smooth (edge-replicated). σ in samples.
 */
export function gaussianSmooth1d(
	series: ArrayLike<number>,
	sigma: number,
): Float64Array {
	const n = series.length;
	const out = new Float64Array(n);
	if (n === 0) return out;
	if (sigma <= 1e-6) {
		for (let i = 0; i < n; i++) out[i] = series[i];
		return out;
	}
	const radius = Math.max(1, Math.ceil(sigma * 3));
	const kernel = new Float64Array(2 * radius + 1);
	let ksum = 0;
	for (let i = -radius; i <= radius; i++) {
		const v = Math.exp(-(i * i) / (2 * sigma * sigma));
		kernel[i + radius] = v;
		ksum += v;
	}
	for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum;

	for (let t = 0; t < n; t++) {
		let acc = 0;
		for (let i = -radius; i <= radius; i++) {
			const src = Math.min(n - 1, Math.max(0, t + i));
			acc += series[src] * kernel[i + radius];
		}
		out[t] = acc;
	}
	return out;
}

function extractSpeechRow(weights: ArrayLike<number>): Float32Array {
	const x = new Float32Array(ARKIT2FLAME_ROWS);
	for (let r = 0; r < ARKIT2FLAME_ROWS; r++) {
		const name = ARKIT2FLAME_CHANNELS[r];
		x[r] = SPEECH_BLENDSHAPE_SET.has(name)
			? (weights[ARKIT_INDEX[name]] ?? 0)
			: 0;
	}
	return x;
}

/** Smooth each ARKit channel across time (zero-phase). */
export function gaussianSmoothWeightSeries(
	frames: ArrayLike<number>[],
	sigmaFrames: number,
): Float32Array[] {
	const n = frames.length;
	if (!n) return [];
	const channels = ARKIT_BLENDSHAPES.length;
	const smoothed: Float32Array[] = Array.from(
		{ length: n },
		() => new Float32Array(channels),
	);
	if (sigmaFrames <= 1e-6) {
		for (let i = 0; i < n; i++) {
			smoothed[i].set(Float32Array.from(frames[i] as ArrayLike<number>));
		}
		return smoothed;
	}
	const col = new Float64Array(n);
	for (let c = 0; c < channels; c++) {
		for (let i = 0; i < n; i++) col[i] = frames[i][c] ?? 0;
		const sm = gaussianSmooth1d(col, sigmaFrames);
		for (let i = 0; i < n; i++) smoothed[i][c] = sm[i];
	}
	return smoothed;
}

/** Decode matrix output to expression delta[100] + jaw delta[3] (not +rest). */
export function decodeDelta(
	raw: Float32Array,
	model: Arkit2FlameModel,
): { expr: Float64Array; jaw: Float64Array } {
	const expr = new Float64Array(100);
	const jaw = new Float64Array(3);
	if (model.pcaComponents > 0 && model.pcaBasis && model.pcaMean) {
		const k = model.pcaComponents;
		for (let i = 0; i < 100; i++) {
			let v = model.pcaMean[i];
			for (let j = 0; j < k; j++)
				v += raw[j] * model.pcaBasis[j * 100 + i];
			expr[i] = v;
		}
		jaw[0] = raw[k];
		jaw[1] = raw[k + 1];
		jaw[2] = raw[k + 2];
	} else {
		for (let i = 0; i < 100; i++) expr[i] = raw[i];
		jaw[0] = raw[100];
		jaw[1] = raw[101];
		jaw[2] = raw[102];
	}
	return { expr, jaw };
}

function stackTemporalRow(
	smoothed: Float32Array[],
	t: number,
	R: number,
	arkitChannels: number,
): Float32Array {
	const n = smoothed.length;
	if (R <= 0) return extractSpeechRow(smoothed[t]);
	const window = 2 * R + 1;
	const stacked = new Float32Array(arkitChannels * window);
	for (let i = 0; i < window; i++) {
		const src = Math.min(n - 1, Math.max(0, t - R + i));
		stacked.set(extractSpeechRow(smoothed[src]), i * arkitChannels);
	}
	return stacked;
}

/** Sample ARKit weights for every frame of a lip-sync clip. */
export function sampleArkitWeightSeries(
	engine: {
		update: (t: number) => void;
		getFrameWeights: () => ArrayLike<number>;
	},
	durationSec: number,
	fps: number,
): Float32Array[] {
	const n = Math.max(1, Math.ceil(Math.max(durationSec, 1 / fps) * fps));
	const out: Float32Array[] = [];
	for (let i = 0; i < n; i++) {
		engine.update(i / fps);
		out.push(Float32Array.from(engine.getFrameWeights()));
	}
	return out;
}

export type BakeArkitFlameFilteredOptions = {
	model: Arkit2FlameModel;
	/** Full-clip ARKit weight frames (52), oldest→newest / t=0…N-1. */
	weights: ArrayLike<number>[];
	params?: Partial<ArkitFlameFilterParams>;
};

/**
 * Offline bake: gaussian → x@M → soft AR gate → jaw scale → slew.
 * Use whenever the utterance is fully known (TTS / calibration clips).
 */
export function bakeArkitFlameFiltered(
	options: BakeArkitFlameFilteredOptions,
): FlameKeyframe[] {
	const model = options.model;
	const p: ArkitFlameFilterParams = {
		...DEFAULT_ARKIT_FLAME_FILTER,
		...options.params,
	};
	const n = options.weights.length;
	if (!n) return [];

	const smoothed = gaussianSmoothWeightSeries(options.weights, p.sigmaFrames);
	const dt = 1 / p.fps;

	const rawGate = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		rawGate[i] = smoothstep(
			p.gateLo,
			p.gateHi,
			arkitSpeechEnergy(options.weights[i]),
		);
	}

	const gate = new Float64Array(n);
	let g = 0;
	let holdLeft = 0;
	for (let i = 0; i < n; i++) {
		const target = rawGate[i];
		if (target >= g - 1e-9) {
			g = arApproach(g, target, dt, p.attackSec, p.releaseSec);
			if (target > 0.5) holdLeft = p.holdSec;
		} else if (holdLeft > 0) {
			holdLeft -= dt;
		} else {
			g = arApproach(g, target, dt, p.attackSec, p.releaseSec);
		}
		gate[i] = g;
	}

	const R = model.temporalRadius;
	const jaw0Delta = new Float64Array(n);
	const exprDeltas: Float64Array[] = new Array(n);
	const jawDeltas: Float64Array[] = new Array(n);

	for (let t = 0; t < n; t++) {
		const srcT = Math.max(0, t - Math.max(0, Math.floor(p.lagFrames)));
		const stacked = stackTemporalRow(
			smoothed,
			srcT,
			R,
			model.arkitChannels,
		);
		const raw = matVec(model.matrix, model.rows, model.cols, stacked);
		const delta = decodeDelta(raw, model);
		exprDeltas[t] = delta.expr;
		jawDeltas[t] = delta.jaw;
		jaw0Delta[t] = delta.jaw[0];
	}

	if (p.postJawSigmaFrames > 1e-6) {
		const sm = gaussianSmooth1d(jaw0Delta, p.postJawSigmaFrames);
		for (let t = 0; t < n; t++) {
			jawDeltas[t][0] = sm[t];
		}
	}

	const rest = model.rest;
	const frames: FlameKeyframe[] = new Array(n);
	let prevJaw0 = rest[100];

	for (let t = 0; t < n; t++) {
		const gT = gate[t];
		const kf = zeroKeyframe();
		const expr = new Array<number>(100);
		for (let i = 0; i < 100; i++) {
			expr[i] = rest[i] + gT * exprDeltas[t][i];
		}
		let jaw0 = rest[100] + p.jawScale * gT * jawDeltas[t][0];
		jaw0 = slewLimit(prevJaw0, jaw0, p.jawSlewPerFrame);
		prevJaw0 = jaw0;
		kf.expression = expr;
		kf.jawPose = [
			jaw0,
			rest[101] + p.jawScale * gT * jawDeltas[t][1],
			rest[102] + p.jawScale * gT * jawDeltas[t][2],
		];
		frames[t] = normalizeKeyframe(kf);
	}

	return frames;
}

/** Causal soft-gate state for streaming (no future). */
export class SoftSpeechGate {
	private g = 0;
	private holdLeft = 0;
	constructor(private readonly params: ArkitFlameFilterParams) {}

	reset(): void {
		this.g = 0;
		this.holdLeft = 0;
	}

	step(speechRms: number, dtSec: number): number {
		const target = smoothstep(
			this.params.gateLo,
			this.params.gateHi,
			speechRms,
		);
		if (target >= this.g - 1e-9) {
			this.g = arApproach(
				this.g,
				target,
				dtSec,
				this.params.attackSec,
				this.params.releaseSec,
			);
			if (target > 0.5) this.holdLeft = this.params.holdSec;
		} else if (this.holdLeft > 0) {
			this.holdLeft -= dtSec;
		} else {
			this.g = arApproach(
				this.g,
				target,
				dtSec,
				this.params.attackSec,
				this.params.releaseSec,
			);
		}
		return this.g;
	}
}

/** Apply soft gate + jaw scale + slew to a raw matrix output (streaming helper). */
export function composeGatedKeyframe(
	raw: Float32Array,
	model: Arkit2FlameModel,
	gate: number,
	jawScale: number,
	prevJaw0: number,
	jawSlewPerFrame: number,
): { keyframe: FlameKeyframe; jaw0: number } {
	const delta = decodeDelta(raw, model);
	const rest = model.rest;
	const kf = zeroKeyframe();
	kf.expression = Array.from(
		{ length: 100 },
		(_, i) => rest[i] + gate * delta.expr[i],
	);
	let jaw0 = rest[100] + jawScale * gate * delta.jaw[0];
	jaw0 = slewLimit(prevJaw0, jaw0, jawSlewPerFrame);
	kf.jawPose = [
		jaw0,
		rest[101] + jawScale * gate * delta.jaw[1],
		rest[102] + jawScale * gate * delta.jaw[2],
	];
	return { keyframe: normalizeKeyframe(kf), jaw0 };
}

export function emptyRestKeyframe(model: Arkit2FlameModel): FlameKeyframe {
	const kf = zeroKeyframe();
	kf.expression = Array.from(model.rest.subarray(0, 100));
	kf.jawPose = [model.rest[100], model.rest[101], model.rest[102]];
	return normalizeKeyframe(kf);
}

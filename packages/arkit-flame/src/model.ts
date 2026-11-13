import {
	ARKIT_BLENDSHAPES,
	ARKIT_INDEX,
	SPEECH_BLENDSHAPE_SET,
	type ARKitBlendshape,
} from "./arkit";
import { normalizeKeyframe, zeroKeyframe, type FlameKeyframe } from "./flame";

/** BEAT2/EMAGE mat_final excludes tongueOut — 51 ARKit channels. */
export const ARKIT2FLAME_CHANNELS: readonly ARKitBlendshape[] =
	ARKIT_BLENDSHAPES.filter((n) => n !== "tongueOut");

export const ARKIT2FLAME_ROWS = 51;
/** Absolute FLAME vector: expr[100] + jaw[3] + neck[3]. */
export const ARKIT2FLAME_COLS = 106;
/** Legacy BEAT2 / pre-neck absolute width (expr+jaw only). */
export const ARKIT2FLAME_COLS_LEGACY = 103;
export const ARKIT2FLAME_EXPR_DIMS = 100;
export const ARKIT2FLAME_JAW_OFFSET = 100;
export const ARKIT2FLAME_NECK_OFFSET = 103;
/** Midpoint of ~1.5–2.6× std match; tune by eye. */
export const DEFAULT_JAW_SCALE = 2;
/** Delay prediction by 1 frame (~40ms @25fps). */
export const DEFAULT_ARKIT_LAG_FRAMES = 1;
/** RMS of speech ARKit channels below this → emit pure rest. */
export const SILENCE_ENERGY_THRESH = 0.02;

export type Arkit2FlameModel = {
	/** Row-major matrix: rows × cols. */
	matrix: Float32Array;
	/** Matrix input rows (51 or 51×(2R+1) when temporal). */
	rows: number;
	/** Matrix output cols (106 raw, pcaK+6, or legacy 103 / pcaK+3). */
	cols: number;
	/** ARKit channel count per frame (always 51). */
	arkitChannels: number;
	/** Temporal radius R → stack t−R..t+R (0 = single frame). */
	temporalRadius: number;
	/** Silence / bind rest: expression[100] + jawPose[3] + neckPose[3]. */
	rest: Float32Array;
	/** PCA basis (pcaK × 100) when predicting modes; null = raw 106/103. */
	pcaBasis: Float32Array | null;
	pcaMean: Float32Array | null;
	pcaComponents: number;
	/** True when matrix predicts neck (pcaK+6 or raw 106). */
	hasNeck: boolean;
};

export type Arkit2FlameMatJson = {
	rows: number;
	cols: number;
	data: number[];
	restExpressionJaw?: number[];
	temporalRadius?: number;
	arkitChannels?: number;
	pcaComponents?: number;
	pcaMean?: number[];
	pcaBasis?: number[];
};

function zeros(n: number): Float32Array {
	return new Float32Array(n);
}

function parseRest(json: Arkit2FlameMatJson): Float32Array {
	const rest = zeros(ARKIT2FLAME_COLS);
	const src = json.restExpressionJaw;
	if (!src || src.length < ARKIT2FLAME_COLS_LEGACY) return rest;
	const n = Math.min(src.length, ARKIT2FLAME_COLS);
	for (let i = 0; i < n; i++) {
		const v = src[i];
		rest[i] = typeof v === "number" && Number.isFinite(v) ? v : 0;
	}
	return rest;
}

function inferHasNeck(pcaComponents: number, cols: number): boolean {
	if (pcaComponents > 0) return cols === pcaComponents + 6;
	return cols === ARKIT2FLAME_COLS;
}

function isValidMatrixShape(
	rows: number,
	cols: number,
	expectedRows: number,
	pcaComponents: number,
): boolean {
	if (rows !== expectedRows) return false;
	if (pcaComponents > 0) {
		return cols === pcaComponents + 6 || cols === pcaComponents + 3;
	}
	return cols === ARKIT2FLAME_COLS || cols === ARKIT2FLAME_COLS_LEGACY;
}

/** Parse a fitted / BEAT2 matrix JSON into a runtime model. */
export function parseArkit2FlameModel(
	json: Arkit2FlameMatJson,
): Arkit2FlameModel {
	const arkitChannels = json.arkitChannels ?? ARKIT2FLAME_ROWS;
	const temporalRadius = Math.max(0, json.temporalRadius ?? 0);
	const expectedRows =
		temporalRadius > 0
			? arkitChannels * (2 * temporalRadius + 1)
			: arkitChannels;
	const pcaComponents = Math.max(0, json.pcaComponents ?? 0);

	if (
		!Array.isArray(json.data) ||
		json.data.length !== json.rows * json.cols ||
		!isValidMatrixShape(json.rows, json.cols, expectedRows, pcaComponents)
	) {
		if (
			json.rows === ARKIT2FLAME_ROWS &&
			json.cols === ARKIT2FLAME_COLS_LEGACY &&
			Array.isArray(json.data) &&
			json.data.length === ARKIT2FLAME_ROWS * ARKIT2FLAME_COLS_LEGACY
		) {
			return {
				matrix: Float32Array.from(json.data),
				rows: ARKIT2FLAME_ROWS,
				cols: ARKIT2FLAME_COLS_LEGACY,
				arkitChannels: ARKIT2FLAME_ROWS,
				temporalRadius: 0,
				rest: parseRest(json),
				pcaBasis: null,
				pcaMean: null,
				pcaComponents: 0,
				hasNeck: false,
			};
		}
		throw new Error(
			`Invalid ARKit→FLAME matrix shape (got ${json.rows}×${json.cols}, expected ${expectedRows}×${pcaComponents > 0 ? `${pcaComponents}+3|+6` : `${ARKIT2FLAME_COLS_LEGACY}|${ARKIT2FLAME_COLS}`})`,
		);
	}

	let pcaBasis: Float32Array | null = null;
	let pcaMean: Float32Array | null = null;
	if (pcaComponents > 0) {
		if (
			!json.pcaBasis ||
			json.pcaBasis.length !== pcaComponents * 100 ||
			!json.pcaMean ||
			json.pcaMean.length !== 100
		) {
			throw new Error("ARKit→FLAME PCA metadata missing or wrong length");
		}
		pcaBasis = Float32Array.from(json.pcaBasis);
		pcaMean = Float32Array.from(json.pcaMean);
	}

	return {
		matrix: Float32Array.from(json.data),
		rows: json.rows,
		cols: json.cols,
		arkitChannels,
		temporalRadius,
		rest: parseRest(json),
		pcaBasis,
		pcaMean,
		pcaComponents,
		hasNeck: inferHasNeck(pcaComponents, json.cols),
	};
}

/** RMS energy over speech-related ARKit channels used by the fit. */
export function arkitSpeechEnergy(weights: ArrayLike<number>): number {
	let sum = 0;
	let n = 0;
	for (const name of ARKIT2FLAME_CHANNELS) {
		if (!SPEECH_BLENDSHAPE_SET.has(name)) continue;
		const v = weights[ARKIT_INDEX[name]] ?? 0;
		sum += v * v;
		n += 1;
	}
	return n > 0 ? Math.sqrt(sum / n) : 0;
}

export function isArkitSilence(
	weights: ArrayLike<number>,
	thresh = SILENCE_ENERGY_THRESH,
): boolean {
	return arkitSpeechEnergy(weights) < thresh;
}

export type ArkitToFlameOptions = {
	/** Multiplier on jawPose *delta* (rest is not scaled). Default DEFAULT_JAW_SCALE. */
	jawScale?: number;
	/** Preloaded model. */
	model?: Arkit2FlameModel;
	/**
	 * Legacy: raw matrix only (implies rest=0, no PCA/temporal).
	 * Prefer `model`.
	 */
	matrix?: Float32Array;
	/** Override rest (106, or legacy 103 padded). Defaults to model.rest. */
	rest?: Float32Array | number[];
	/** If true (default), silence frames emit pure rest. */
	gateSilence?: boolean;
	silenceThresh?: number;
};

function padRest(src: Float32Array | number[] | undefined): Float32Array {
	const rest = zeros(ARKIT2FLAME_COLS);
	if (!src) return rest;
	const n = Math.min(src.length, ARKIT2FLAME_COLS);
	for (let i = 0; i < n; i++) {
		const v = src[i];
		rest[i] = typeof v === "number" && Number.isFinite(v) ? v : 0;
	}
	return rest;
}

function modelFromOptions(options: ArkitToFlameOptions): Arkit2FlameModel {
	if (options.model) {
		return options.model.hasNeck !== undefined
			? options.model
			: {
					...options.model,
					hasNeck: inferHasNeck(
						options.model.pcaComponents,
						options.model.cols,
					),
				};
	}
	if (options.matrix) {
		const legacyLen = ARKIT2FLAME_ROWS * ARKIT2FLAME_COLS_LEGACY;
		const fullLen = ARKIT2FLAME_ROWS * ARKIT2FLAME_COLS;
		if (
			options.matrix.length !== fullLen &&
			options.matrix.length !== legacyLen
		) {
			throw new Error(
				"ARKit→FLAME matrix not loaded; pass a parsed model via options.model",
			);
		}
		const cols =
			options.matrix.length === fullLen
				? ARKIT2FLAME_COLS
				: ARKIT2FLAME_COLS_LEGACY;
		return {
			matrix: options.matrix,
			rows: ARKIT2FLAME_ROWS,
			cols,
			arkitChannels: ARKIT2FLAME_ROWS,
			temporalRadius: 0,
			rest: padRest(options.rest),
			pcaBasis: null,
			pcaMean: null,
			pcaComponents: 0,
			hasNeck: cols === ARKIT2FLAME_COLS,
		};
	}
	throw new Error(
		"ARKit→FLAME matrix not loaded; pass a parsed model via options.model",
	);
}

export function extractArkitRow(weights: ArrayLike<number>): Float32Array {
	const x = new Float32Array(ARKIT2FLAME_ROWS);
	for (let r = 0; r < ARKIT2FLAME_ROWS; r++) {
		const name = ARKIT2FLAME_CHANNELS[r];
		x[r] = SPEECH_BLENDSHAPE_SET.has(name)
			? (weights[ARKIT_INDEX[name]] ?? 0)
			: 0;
	}
	return x;
}

export function matVec(
	matrix: Float32Array,
	rows: number,
	cols: number,
	x: ArrayLike<number>,
): Float32Array {
	const y = new Float32Array(cols);
	for (let c = 0; c < cols; c++) {
		let sum = 0;
		for (let r = 0; r < rows; r++) {
			sum += (x[r] ?? 0) * matrix[r * cols + c];
		}
		y[c] = sum;
	}
	return y;
}

function decodeOutput(
	raw: Float32Array,
	model: Arkit2FlameModel,
	jawScale: number,
): FlameKeyframe {
	const rest = model.rest;
	const kf = zeroKeyframe();
	const hasNeck =
		model.hasNeck ?? inferHasNeck(model.pcaComponents, model.cols);

	if (model.pcaComponents > 0 && model.pcaBasis && model.pcaMean) {
		const k = model.pcaComponents;
		const expr = new Array<number>(ARKIT2FLAME_EXPR_DIMS);
		for (let i = 0; i < ARKIT2FLAME_EXPR_DIMS; i++) {
			let v = model.pcaMean[i] + rest[i];
			for (let j = 0; j < k; j++) {
				v += raw[j] * model.pcaBasis[j * 100 + i];
			}
			expr[i] = v;
		}
		kf.expression = expr;
		kf.jawPose = [
			rest[ARKIT2FLAME_JAW_OFFSET] + raw[k] * jawScale,
			rest[ARKIT2FLAME_JAW_OFFSET + 1] + raw[k + 1] * jawScale,
			rest[ARKIT2FLAME_JAW_OFFSET + 2] + raw[k + 2] * jawScale,
		];
		if (hasNeck) {
			kf.neckPose = [
				rest[ARKIT2FLAME_NECK_OFFSET] + raw[k + 3],
				rest[ARKIT2FLAME_NECK_OFFSET + 1] + raw[k + 4],
				rest[ARKIT2FLAME_NECK_OFFSET + 2] + raw[k + 5],
			];
		} else {
			kf.neckPose = [
				rest[ARKIT2FLAME_NECK_OFFSET],
				rest[ARKIT2FLAME_NECK_OFFSET + 1],
				rest[ARKIT2FLAME_NECK_OFFSET + 2],
			];
		}
	} else {
		kf.expression = Array.from(
			{ length: ARKIT2FLAME_EXPR_DIMS },
			(_, i) => rest[i] + raw[i],
		);
		kf.jawPose = [
			rest[ARKIT2FLAME_JAW_OFFSET] +
				raw[ARKIT2FLAME_JAW_OFFSET] * jawScale,
			rest[ARKIT2FLAME_JAW_OFFSET + 1] +
				raw[ARKIT2FLAME_JAW_OFFSET + 1] * jawScale,
			rest[ARKIT2FLAME_JAW_OFFSET + 2] +
				raw[ARKIT2FLAME_JAW_OFFSET + 2] * jawScale,
		];
		if (hasNeck) {
			kf.neckPose = [
				rest[ARKIT2FLAME_NECK_OFFSET] + raw[ARKIT2FLAME_NECK_OFFSET],
				rest[ARKIT2FLAME_NECK_OFFSET + 1] +
					raw[ARKIT2FLAME_NECK_OFFSET + 1],
				rest[ARKIT2FLAME_NECK_OFFSET + 2] +
					raw[ARKIT2FLAME_NECK_OFFSET + 2],
			];
		} else {
			kf.neckPose = [
				rest[ARKIT2FLAME_NECK_OFFSET],
				rest[ARKIT2FLAME_NECK_OFFSET + 1],
				rest[ARKIT2FLAME_NECK_OFFSET + 2],
			];
		}
	}
	return normalizeKeyframe(kf);
}

export function restKeyframe(model: Arkit2FlameModel): FlameKeyframe {
	const kf = zeroKeyframe();
	kf.expression = Array.from(model.rest.subarray(0, ARKIT2FLAME_EXPR_DIMS));
	kf.jawPose = [
		model.rest[ARKIT2FLAME_JAW_OFFSET],
		model.rest[ARKIT2FLAME_JAW_OFFSET + 1],
		model.rest[ARKIT2FLAME_JAW_OFFSET + 2],
	];
	kf.neckPose = [
		model.rest[ARKIT2FLAME_NECK_OFFSET],
		model.rest[ARKIT2FLAME_NECK_OFFSET + 1],
		model.rest[ARKIT2FLAME_NECK_OFFSET + 2],
	];
	return normalizeKeyframe(kf);
}

/**
 * Map ARKit weights → FLAME keyframe.
 * Applies `y = x @ M + rest` (deltas from calibrated silence rest).
 */
export function arkitWeightsToFlame(
	weights: ArrayLike<number>,
	options: ArkitToFlameOptions = {},
): FlameKeyframe {
	const model = modelFromOptions(options);
	if (model.temporalRadius > 0) {
		throw new Error(
			"Temporal ARKit→FLAME model requires arkitWeightHistoryToFlame()",
		);
	}

	const gate = options.gateSilence !== false;
	if (gate && isArkitSilence(weights, options.silenceThresh)) {
		return restKeyframe(model);
	}

	const jawScale = options.jawScale ?? DEFAULT_JAW_SCALE;
	const x = extractArkitRow(weights);
	const raw = matVec(model.matrix, model.rows, model.cols, x);
	return decodeOutput(raw, model, jawScale);
}

/**
 * Temporal model: `history` is oldest→newest, length 2R+1 (or any length;
 * missing frames are edge-padded / truncated to the window).
 */
export function arkitWeightHistoryToFlame(
	history: ArrayLike<number>[],
	options: ArkitToFlameOptions = {},
): FlameKeyframe {
	const model = modelFromOptions(options);
	const R = model.temporalRadius;
	if (R <= 0) {
		const last = history[history.length - 1] ?? new Float32Array(52);
		return arkitWeightsToFlame(last, options);
	}

	const center =
		history[Math.min(history.length - 1, R)] ?? history[history.length - 1];
	const gate = options.gateSilence !== false;
	if (center && gate && isArkitSilence(center, options.silenceThresh)) {
		return restKeyframe(model);
	}

	const window = 2 * R + 1;
	const stacked = new Float32Array(model.rows);
	const first = history[0];
	const last = history[history.length - 1];
	for (let i = 0; i < window; i++) {
		let frame: ArrayLike<number>;
		if (history.length >= window) {
			frame = history[i];
		} else {
			const src = i - (window - history.length);
			if (src < 0) frame = first;
			else if (src >= history.length) frame = last;
			else frame = history[src];
		}
		stacked.set(extractArkitRow(frame), i * model.arkitChannels);
	}

	const jawScale = options.jawScale ?? DEFAULT_JAW_SCALE;
	const raw = matVec(model.matrix, model.rows, model.cols, stacked);
	return decodeOutput(raw, model, jawScale);
}

/**
 * Ring buffer helper for lag + temporal windows.
 * Push current weights each tick; sample delayed history for conversion.
 */
export class ArkitWeightRing {
	private buf: Float32Array[] = [];
	private readonly capacity: number;

	constructor(capacity: number) {
		this.capacity = Math.max(1, capacity);
	}

	push(weights: ArrayLike<number>): void {
		const copy = Float32Array.from(weights as ArrayLike<number>);
		this.buf.push(copy);
		if (this.buf.length > this.capacity) this.buf.shift();
	}

	clear(): void {
		this.buf = [];
	}

	/** Latest frame, or null if empty. */
	latest(): Float32Array | null {
		return this.buf[this.buf.length - 1] ?? null;
	}

	/**
	 * Frame from `lagFrames` ago (0 = latest). Pads with oldest if short.
	 */
	atLag(lagFrames: number): Float32Array | null {
		if (!this.buf.length) return null;
		const lag = Math.max(0, Math.floor(lagFrames));
		const idx = Math.max(0, this.buf.length - 1 - lag);
		return this.buf[idx];
	}

	/**
	 * Window of length `size` ending at `lagFrames` ago (oldest→newest).
	 */
	windowEndingAtLag(size: number, lagFrames: number): Float32Array[] {
		if (!this.buf.length) return [];
		const end = Math.max(0, this.buf.length - 1 - Math.max(0, lagFrames));
		const start = Math.max(0, end - size + 1);
		const out = this.buf.slice(start, end + 1);
		while (out.length < size) out.unshift(out[0]);
		return out;
	}
}

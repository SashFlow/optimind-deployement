import type { Object3D } from "three";
import {
	ARKIT_BLENDSHAPES,
	ARKIT_COUNT,
	ARKIT_INDEX,
	clamp01,
	type ARKitBlendshape,
} from "../arkit";
import { CoarticulationEvaluator } from "../coarticulation/evaluator";
import { DEFAULT_MAPPING } from "../mapping/defaultMapping";
import {
	MorphTargetRetargeter,
	type MorphDiscoveryReport,
} from "../retarget/MorphTargetRetargeter";
import type {
	EditMode,
	EnginePlaybackState,
	LipSyncInput,
	LipSyncOptions,
	PhonemeMapping,
	TimedPhoneme,
} from "../types";

export class ARKitLipSyncEngine {
	private readonly evaluator: CoarticulationEvaluator;
	private readonly retargeter: MorphTargetRetargeter;
	private timeOffsetSeconds: number;
	private state: EnginePlaybackState = "stopped";
	private playhead = 0;
	private editMode: EditMode = "playback";
	private readonly manualWeights = new Float32Array(ARKIT_COUNT);
	private hasManual = false;
	private readonly expressionLayer = new Float32Array(ARKIT_COUNT);
	private hasExpressions = false;
	private readonly frameBuffer = new Float32Array(ARKIT_COUNT);
	private readonly lifeBuffer = new Float32Array(ARKIT_COUNT);
	private jawLag = 0;
	private discovery: MorphDiscoveryReport | null = null;
	private input: LipSyncInput | null = null;

	constructor(options: LipSyncOptions = {}) {
		this.evaluator = new CoarticulationEvaluator(
			options.mapping ?? DEFAULT_MAPPING,
			options.coarticulation,
		);
		this.retargeter = new MorphTargetRetargeter({
			morphAliases: options.morphAliases,
			speechOnly: options.speechOnly !== false,
		});
		this.timeOffsetSeconds = options.timeOffsetSeconds ?? 0;
	}

	attachAvatar(root: Object3D): MorphDiscoveryReport {
		this.discovery = this.retargeter.attach(root);
		return this.discovery;
	}

	getDiscovery(): MorphDiscoveryReport | null {
		return this.discovery;
	}

	setPhonemes(input: LipSyncInput): void {
		this.input = input;
		this.evaluator.setPhonemes(input);
	}

	/** Append streamed phonemes (offsets assumed already absolute to audio start). */
	appendPhonemes(phonemes: TimedPhoneme[], newDuration?: number): void {
		const existing = this.input?.phonemes ?? [];
		const duration = Math.max(
			this.input?.duration ?? 0,
			newDuration ?? 0,
			...phonemes.map((p) => p.end),
		);
		this.setPhonemes({ phonemes: [...existing, ...phonemes], duration });
	}

	setMapping(mapping: PhonemeMapping): void {
		this.evaluator.setMapping(mapping);
	}

	getMapping(): PhonemeMapping {
		return this.evaluator.getMapping();
	}

	setOverrideLayers(
		layers: Parameters<CoarticulationEvaluator["setOverrideLayers"]>[0],
	): void {
		this.evaluator.setOverrideLayers(layers);
	}

	setCoarticulation(
		partial: Parameters<CoarticulationEvaluator["setOptions"]>[0],
	): void {
		this.evaluator.setOptions(partial);
	}

	getCoarticulation() {
		return this.evaluator.getOptions();
	}

	setTimeOffset(seconds: number): void {
		this.timeOffsetSeconds = seconds;
	}

	/**
	 * Drive animation from an external audio clock (HTMLAudioElement.currentTime or WebAudio).
	 * Do not pass rAF elapsed time.
	 */
	update(timeSeconds: number): void {
		if (this.editMode === "phoneme" && this.hasManual) {
			this.composeAndApply(this.manualWeights);
			return;
		}
		if (this.editMode === "framePreview" && this.hasManual) {
			this.composeAndApply(this.manualWeights);
			return;
		}

		if (this.state === "stopped") {
			// Neutral speech, but keep expression layer (blinks / idle) alive.
			this.frameBuffer.fill(0);
			this.composeAndApply(this.frameBuffer);
			return;
		}

		this.playhead = timeSeconds;
		const t = timeSeconds + this.timeOffsetSeconds;
		const speech = this.evaluator.evaluate(t);
		this.composeAndApply(this.addSpeechLife(speech, t));
	}

	/**
	 * Small secondary motion on top of the evaluated speech pose: jaw micro-noise,
	 * cheek follow-through, speech-emphasis brow lift and a slight smile bias.
	 * Scaled by jaw opening so silence stays perfectly neutral.
	 */
	private addSpeechLife(speech: Float32Array, t: number): Float32Array {
		const out = this.lifeBuffer;
		out.set(speech);
		const jaw = out[ARKIT_INDEX.jawOpen];
		this.jawLag += (jaw - this.jawLag) * 0.15;
		if (jaw < 0.03 && this.jawLag < 0.03) return out;

		const noise = 0.5 * (Math.sin(t * 7.3) + Math.sin(t * 11.1 + 1.3));
		out[ARKIT_INDEX.jawOpen] = clamp01(
			jaw + 0.02 * noise * Math.min(1, jaw * 3),
		);

		const bump = (name: ARKitBlendshape, v: number) => {
			const i = ARKIT_INDEX[name];
			out[i] = clamp01(Math.max(out[i], v));
		};
		const speaking = Math.min(1, jaw * 4);
		bump("cheekSquintLeft", 0.12 * this.jawLag);
		bump("cheekSquintRight", 0.12 * this.jawLag);
		bump("mouthSmileLeft", 0.04 * speaking);
		bump("mouthSmileRight", 0.04 * speaking);
		// Emphasis = jaw opening faster than its lagged average.
		bump(
			"browInnerUp",
			Math.min(0.1, Math.max(0, jaw - this.jawLag) * 0.4),
		);
		return out;
	}

	private composeAndApply(speech: Float32Array): void {
		this.frameBuffer.set(speech);
		if (this.hasExpressions) {
			for (let i = 0; i < ARKIT_COUNT; i++) {
				const e = this.expressionLayer[i];
				if (e > 0)
					this.frameBuffer[i] = clamp01(
						Math.max(this.frameBuffer[i], e),
					);
			}
		}
		this.retargeter.applyWeights(this.frameBuffer);
	}

	play(): void {
		this.state = "playing";
		if (this.editMode !== "playback") this.editMode = "playback";
	}

	pause(): void {
		this.state = "paused";
	}

	seek(timeSeconds: number): void {
		this.playhead = Math.max(0, timeSeconds);
		if (this.state === "stopped") this.state = "paused";
		if (this.editMode === "playback" || !this.hasManual) {
			const speech = this.evaluator.evaluate(
				this.playhead + this.timeOffsetSeconds,
			);
			this.composeAndApply(speech);
		} else {
			this.composeAndApply(this.manualWeights);
		}
	}

	stop(): void {
		this.state = "stopped";
		this.playhead = 0;
		this.clearManualWeights();
		this.editMode = "playback";
		// Clear speech pose; expression layer (idle blinks) is preserved.
		this.frameBuffer.fill(0);
		this.composeAndApply(this.frameBuffer);
	}

	getState(): EnginePlaybackState {
		return this.state;
	}

	getPlayhead(): number {
		return this.playhead;
	}

	getCurrentPhone() {
		return this.evaluator.phoneAt(this.playhead + this.timeOffsetSeconds);
	}

	getPhonemes() {
		return this.evaluator.getPrepared();
	}

	getDuration(): number {
		return this.evaluator.getDuration();
	}

	/** Enter calibration: engine will not overwrite manual weights. */
	setEditMode(mode: EditMode): void {
		this.editMode = mode;
		if (mode === "playback") {
			// keep manual until cleared explicitly when resuming playback optionally
		}
	}

	getEditMode(): EditMode {
		return this.editMode;
	}

	setCalibrationMode(enabled: boolean): void {
		this.setEditMode(enabled ? "phoneme" : "playback");
	}

	/**
	 * Manual / calibration / frame-preview weights.
	 * Sparse record; omitted keys stay at current manual or 0.
	 */
	setManualWeights(
		weights: Partial<Record<ARKitBlendshape, number>>,
		replace = false,
	): void {
		if (replace) this.manualWeights.fill(0);
		for (const [name, value] of Object.entries(weights)) {
			const idx = ARKIT_BLENDSHAPES.indexOf(name as ARKitBlendshape);
			if (idx >= 0 && value !== undefined)
				this.manualWeights[idx] = clamp01(value);
		}
		this.hasManual = true;
		this.composeAndApply(this.manualWeights);
	}

	setManualWeight(name: ARKitBlendshape, value: number): void {
		const idx = ARKIT_BLENDSHAPES.indexOf(name);
		if (idx < 0) return;
		this.manualWeights[idx] = clamp01(value);
		this.hasManual = true;
		this.composeAndApply(this.manualWeights);
	}

	getManualWeights(): Float32Array {
		return this.manualWeights;
	}

	clearManualWeights(): void {
		this.manualWeights.fill(0);
		this.hasManual = false;
	}

	previewPhone(phone: string): void {
		const pose = this.evaluator.evaluatePhonePose(phone);
		this.manualWeights.set(pose);
		this.hasManual = true;
		this.editMode = "phoneme";
		this.composeAndApply(this.manualWeights);
	}

	/** Independent expression layer (blinks, emotion) — not driven by phonemes. */
	setExpressionWeights(
		weights: Partial<Record<ARKitBlendshape, number>>,
	): void {
		this.expressionLayer.fill(0);
		this.hasExpressions = false;
		for (const [name, value] of Object.entries(weights)) {
			const idx = ARKIT_BLENDSHAPES.indexOf(name as ARKitBlendshape);
			if (idx >= 0 && value !== undefined && value > 0) {
				this.expressionLayer[idx] = clamp01(value);
				this.hasExpressions = true;
			}
		}
	}

	getActiveWeights(): Float32Array {
		return this.frameBuffer;
	}

	hasMorph(name: string): boolean {
		return this.retargeter.has(name);
	}

	dispose(): void {
		this.stop();
		this.retargeter.dispose();
		this.input = null;
	}
}

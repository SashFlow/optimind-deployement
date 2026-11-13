import {
	cloneKeyframe,
	getDefaultFlameRestNeck,
	type FlameKeyframe,
} from "@repo/arkit-flame";

/** Default ease-out from speech pose back to idle after talk ends. */
export const DEFAULT_SPEECH_RELEASE_MS = 450;
/** Default ease-in from idle into first speech frame (hard-capped at 100ms). */
export const DEFAULT_SPEECH_ATTACK_MS = 100;
/**
 * Speech neck delta multiplier on top of idle.pb neck.
 * Keep low: idle already carries most head motion; >1 stacks too hard.
 */
export const DEFAULT_NECK_SCALE = 2;

/** Speech overlay replaces expression + jawPose; neckPose when set. Idle keeps the rest. */
export type SpeechOverlay = {
	expression: number[];
	jawPose: number[];
	/**
	 * Absolute speech-bake neckPose (rest + delta). Composited as
	 * idle.neck + neckScale * (neckPose − restNeck). Omit to leave idle neck.
	 */
	neckPose?: number[];
};

type SpeechFade = {
	mode: "in" | "out";
	from: SpeechOverlay;
	startMs: number;
	durationMs: number;
};

export type SpeechOverlayControllerOptions = {
	attackMs?: number;
	releaseMs?: number;
	/** Multiplier on (speechNeck − restNeck) added to idle neck. */
	neckScale?: number;
	/** Bind neck matching the worker ARKit→FLAME rest (defaults to bundled model). */
	restNeck?: [number, number, number];
};

export type ApplySpeechOverlayOptions = {
	neckScale?: number;
	restNeck?: [number, number, number];
};

function smoothstep(t: number): number {
	const x = Math.min(1, Math.max(0, t));
	return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function copyPose3(src: number[] | undefined): [number, number, number] {
	return [
		typeof src?.[0] === "number" && Number.isFinite(src[0]) ? src[0] : 0,
		typeof src?.[1] === "number" && Number.isFinite(src[1]) ? src[1] : 0,
		typeof src?.[2] === "number" && Number.isFinite(src[2]) ? src[2] : 0,
	];
}

function resolveRestNeck(
	restNeck?: [number, number, number],
): [number, number, number] {
	return restNeck ? copyPose3(restNeck) : getDefaultFlameRestNeck();
}

export function cloneSpeechOverlay(src: SpeechOverlay): SpeechOverlay {
	const out: SpeechOverlay = {
		expression: src.expression.slice(0, 100),
		jawPose: copyPose3(src.jawPose),
	};
	if (src.neckPose) out.neckPose = copyPose3(src.neckPose);
	return out;
}

/**
 * Idle snapshot for attack/release fades. Neck is set to rest (zero speech
 * delta) so additive composite eases neck without fighting idle.pb motion.
 */
export function speechOverlayFromIdle(
	idle: FlameKeyframe,
	restNeck: [number, number, number] = getDefaultFlameRestNeck(),
): SpeechOverlay {
	return {
		expression: idle.expression.slice(0, 100),
		jawPose: [...idle.jawPose],
		neckPose: copyPose3(restNeck),
	};
}

/** Build overlay from a FLAME keyframe. Pass `includeNeck: false` to keep idle neck. */
export function speechOverlayFromFlame(
	kf: FlameKeyframe,
	options: { includeNeck?: boolean } = {},
): SpeechOverlay {
	const includeNeck = options.includeNeck !== false;
	const out: SpeechOverlay = {
		expression: kf.expression.slice(0, 100),
		jawPose: copyPose3(kf.jawPose),
	};
	if (includeNeck) out.neckPose = copyPose3(kf.neckPose);
	return out;
}

/**
 * Replace expression + jaw; add scaled speech neck delta onto idle neck.
 * Absolute speech neck ≈ rest → idle neck unchanged.
 */
export function applySpeechOverlay(
	idle: FlameKeyframe,
	speech: SpeechOverlay,
	options: ApplySpeechOverlayOptions = {},
): FlameKeyframe {
	const out = cloneKeyframe(idle);
	const expr = speech.expression ?? [];
	out.expression = Array.from({ length: 100 }, (_, i) =>
		typeof expr[i] === "number" && Number.isFinite(expr[i]) ? expr[i] : 0,
	);
	out.jawPose = copyPose3(speech.jawPose);
	if (speech.neckPose) {
		const scale =
			typeof options.neckScale === "number" &&
			Number.isFinite(options.neckScale)
				? options.neckScale
				: DEFAULT_NECK_SCALE;
		const rest = resolveRestNeck(options.restNeck);
		const speechNeck = copyPose3(speech.neckPose);
		out.neckPose = [
			idle.neckPose[0] + scale * (speechNeck[0] - rest[0]),
			idle.neckPose[1] + scale * (speechNeck[1] - rest[1]),
			idle.neckPose[2] + scale * (speechNeck[2] - rest[2]),
		];
	}
	return out;
}

function blendOverlays(
	from: SpeechOverlay,
	to: SpeechOverlay,
	u: number,
	restNeck: [number, number, number],
): SpeechOverlay {
	const t = smoothstep(u);
	const out: SpeechOverlay = {
		expression: Array.from({ length: 100 }, (_, i) =>
			lerp(from.expression[i] ?? 0, to.expression[i] ?? 0, t),
		),
		jawPose: [
			lerp(from.jawPose[0] ?? 0, to.jawPose[0] ?? 0, t),
			lerp(from.jawPose[1] ?? 0, to.jawPose[1] ?? 0, t),
			lerp(from.jawPose[2] ?? 0, to.jawPose[2] ?? 0, t),
		],
	};
	if (from.neckPose || to.neckPose) {
		out.neckPose = [
			lerp(
				from.neckPose?.[0] ?? restNeck[0],
				to.neckPose?.[0] ?? restNeck[0],
				t,
			),
			lerp(
				from.neckPose?.[1] ?? restNeck[1],
				to.neckPose?.[1] ?? restNeck[1],
				t,
			),
			lerp(
				from.neckPose?.[2] ?? restNeck[2],
				to.neckPose?.[2] ?? restNeck[2],
				t,
			),
		];
	}
	return out;
}

function sampleFade(
	fade: SpeechFade,
	to: SpeechOverlay,
	nowMs: number,
	restNeck: [number, number, number],
): { overlay: SpeechOverlay; done: boolean } {
	const u = (nowMs - fade.startMs) / Math.max(1, fade.durationMs);
	if (u >= 1) return { overlay: cloneSpeechOverlay(to), done: true };
	return {
		overlay: blendOverlays(fade.from, to, u, restNeck),
		done: false,
	};
}

/**
 * Composites speech expression+jawPose onto idle FLAME with attack/release fades.
 * Neck is idle.pb + neckScale × (speechNeck − rest); eyes/body/translation stay idle.
 */
export class SpeechOverlayController {
	private speech: SpeechOverlay | null = null;
	private lastSpeech: SpeechOverlay | null = null;
	private lastIdle: SpeechOverlay | null = null;
	private fade: SpeechFade | null = null;
	private attackMs: number;
	private releaseMs: number;
	private neckScale: number;
	private restNeck: [number, number, number];

	constructor(options: SpeechOverlayControllerOptions = {}) {
		this.attackMs = Math.min(
			100,
			Math.max(0, options.attackMs ?? DEFAULT_SPEECH_ATTACK_MS),
		);
		this.releaseMs = Math.max(
			0,
			options.releaseMs ?? DEFAULT_SPEECH_RELEASE_MS,
		);
		this.neckScale =
			typeof options.neckScale === "number" &&
			Number.isFinite(options.neckScale)
				? options.neckScale
				: DEFAULT_NECK_SCALE;
		this.restNeck = resolveRestNeck(options.restNeck);
	}

	private applyOptions(): ApplySpeechOverlayOptions {
		return { neckScale: this.neckScale, restNeck: this.restNeck };
	}

	setTiming(options: SpeechOverlayControllerOptions): void {
		if (options.attackMs != null) {
			this.attackMs = Math.min(100, Math.max(0, options.attackMs));
		}
		if (options.releaseMs != null) {
			this.releaseMs = Math.max(0, options.releaseMs);
		}
		if (options.neckScale != null && Number.isFinite(options.neckScale)) {
			this.neckScale = options.neckScale;
		}
		if (options.restNeck) {
			this.restNeck = copyPose3(options.restNeck);
		}
	}

	reset(): void {
		this.speech = null;
		this.lastSpeech = null;
		this.lastIdle = null;
		this.fade = null;
	}

	/**
	 * Push speech expression+jawPose+neckPose, or null to release back to idle.
	 * First frame eases in from idle (≤100ms); clear eases out.
	 */
	setSpeech(overlay: SpeechOverlay | null): void {
		const now = performance.now();
		if (overlay) {
			const next = cloneSpeechOverlay(overlay);
			const starting = !this.speech && this.fade?.mode !== "in";
			this.speech = next;
			this.lastSpeech = next;

			if (starting) {
				let from: SpeechOverlay;
				if (this.fade?.mode === "out") {
					const idleTarget =
						this.lastIdle ??
						({
							expression: next.expression.slice(0, 100),
							jawPose: copyPose3(next.jawPose),
							neckPose: copyPose3(this.restNeck),
						} satisfies SpeechOverlay);
					from = sampleFade(
						this.fade,
						idleTarget,
						now,
						this.restNeck,
					).overlay;
				} else {
					from = this.lastIdle
						? cloneSpeechOverlay(this.lastIdle)
						: {
								expression: next.expression.slice(0, 100),
								jawPose: copyPose3(next.jawPose),
								neckPose: copyPose3(this.restNeck),
							};
				}
				if (this.attackMs <= 0) {
					this.fade = null;
				} else {
					this.fade = {
						mode: "in",
						from,
						startMs: now,
						durationMs: this.attackMs,
					};
				}
			}
			return;
		}

		let from = this.lastSpeech ?? this.speech;
		if (this.fade?.mode === "in" && from) {
			from = sampleFade(this.fade, from, now, this.restNeck).overlay;
		}
		this.speech = null;
		if (!from) {
			this.fade = null;
			return;
		}
		if (this.releaseMs <= 0) {
			this.fade = null;
			this.lastSpeech = null;
			return;
		}
		this.fade = {
			mode: "out",
			from: cloneSpeechOverlay(from),
			startMs: now,
			durationMs: this.releaseMs,
		};
	}

	/** Merge current speech (with attack/release) onto an idle keyframe. */
	composite(idle: FlameKeyframe, nowMs = performance.now()): FlameKeyframe {
		const idleOverlay = speechOverlayFromIdle(idle, this.restNeck);
		const fade = this.fade;
		const speech = this.speech;
		const opts = this.applyOptions();

		if (fade?.mode === "in" && speech) {
			const sample = sampleFade(fade, speech, nowMs, this.restNeck);
			if (sample.done) this.fade = null;
			return applySpeechOverlay(idle, sample.overlay, opts);
		}

		if (fade?.mode === "out") {
			const sample = sampleFade(fade, idleOverlay, nowMs, this.restNeck);
			if (sample.done) {
				this.fade = null;
				this.lastSpeech = null;
				this.lastIdle = idleOverlay;
				return idle;
			}
			this.lastIdle = idleOverlay;
			return applySpeechOverlay(idle, sample.overlay, opts);
		}

		if (speech) {
			return applySpeechOverlay(idle, speech, opts);
		}

		this.lastIdle = idleOverlay;
		return idle;
	}
}

import {
	ARKIT_BLENDSHAPES,
	ARKIT_COUNT,
	type ARKitBlendshape,
} from "@/lib/arkit-lipsync/arkit";
import { OneEuro } from "./oneEuro";

export const ARKIT_NAMES = ARKIT_BLENDSHAPES;
export type ArkitName = ARKitBlendshape;

/** Per-channel gain; tune after the ?mode=sweep pass. */
export const CHANNEL_GAIN: Partial<Record<ArkitName, number>> = {
	jawOpen: 1.0,
	mouthFunnel: 1.0,
	mouthPucker: 1.0,
	mouthClose: 1.0,
	tongueOut: 0, // no-op on FLAME avatars
};

/** Holds the latest weights and exposes them to the renderer as a name->value map. */
export class WeightBridge {
	private latest = new Float32Array(ARKIT_COUNT);
	private filters = ARKIT_NAMES.map(() => new OneEuro());

	/** Feed 52 raw ARKit weights (e.g. engine sink). */
	push(raw: ArrayLike<number>, tSec: number): void {
		for (let i = 0; i < ARKIT_COUNT; i++) {
			const g = CHANNEL_GAIN[ARKIT_NAMES[i]] ?? 1;
			const v = Math.min(1, Math.max(0, raw[i] * g));
			this.latest[i] = this.filters[i].filter(v, tSec);
		}
	}

	/** Renderer-facing: current expression as {name: weight}. */
	getExpressionData(): Record<string, number> {
		const out: Record<string, number> = {};
		for (let i = 0; i < ARKIT_COUNT; i++)
			out[ARKIT_NAMES[i]] = this.latest[i];
		return out;
	}
}

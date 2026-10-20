import {
	ARKIT_BLENDSHAPES,
	ARKIT_COUNT,
	type ARKitBlendshape,
} from "@/lib/arkit-lipsync/arkit";
import { OneEuro } from "./oneEuro";

export type ArkitName = ARKitBlendshape;

/** Per-channel gain; tongueOut is a no-op on FLAME avatars. */
export const CHANNEL_GAIN: Partial<Record<ArkitName, number>> = {
	jawOpen: 1.0,
	mouthFunnel: 1.0,
	mouthPucker: 1.0,
	mouthClose: 1.0,
	tongueOut: 0,
};

/** Holds the latest weights and exposes them to the 3DGS renderer as a name→value map. */
export class WeightBridge {
	private latest = new Float32Array(ARKIT_COUNT);
	private filters = ARKIT_BLENDSHAPES.map(() => new OneEuro());

	/** Feed 52 raw ARKit weights from the lipsync engine. */
	push(raw: ArrayLike<number>, tSec: number): void {
		for (let i = 0; i < ARKIT_COUNT; i++) {
			const g = CHANNEL_GAIN[ARKIT_BLENDSHAPES[i]] ?? 1;
			const v = Math.min(1, Math.max(0, raw[i] * g));
			this.latest[i] = this.filters[i].filter(v, tSec);
		}
	}

	/** Renderer-facing: current expression as `{ name: weight }`. */
	getExpressionData(): Record<string, number> {
		const out: Record<string, number> = {};
		for (let i = 0; i < ARKIT_COUNT; i++) {
			out[ARKIT_BLENDSHAPES[i]] = this.latest[i];
		}
		return out;
	}
}

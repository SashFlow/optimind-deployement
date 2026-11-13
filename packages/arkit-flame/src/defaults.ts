import filterJson from "../assets/arkit2flame-filter.json";
import matJson from "../assets/arkit2flame-mat.json";
import { parseArkitFlameFilter, type ArkitFlameFilterParams } from "./filter";
import {
	ARKIT2FLAME_NECK_OFFSET,
	parseArkit2FlameModel,
	type Arkit2FlameMatJson,
	type Arkit2FlameModel,
} from "./model";
import { ArkitFlameProcessor } from "./stream";

let cachedModel: Arkit2FlameModel | null = null;
let cachedFilter: ArkitFlameFilterParams | null = null;
let cachedRestNeck: [number, number, number] | null = null;

/** Bundled fitted matrix (no network). */
export function getDefaultArkit2FlameModel(): Arkit2FlameModel {
	if (!cachedModel) {
		cachedModel = parseArkit2FlameModel(
			matJson as unknown as Arkit2FlameMatJson,
		);
	}
	return cachedModel;
}

/**
 * Bind / silence neckPose from the bundled ARKit→FLAME rest vector.
 * Speech neck deltas are absolute_bake − this rest.
 */
export function getDefaultFlameRestNeck(): [number, number, number] {
	if (!cachedRestNeck) {
		const rest = getDefaultArkit2FlameModel().rest;
		cachedRestNeck = [
			rest[ARKIT2FLAME_NECK_OFFSET],
			rest[ARKIT2FLAME_NECK_OFFSET + 1],
			rest[ARKIT2FLAME_NECK_OFFSET + 2],
		];
	}
	return cachedRestNeck;
}

/** Bundled filter params (attack/release/hold/jaw…). */
export function getDefaultArkitFlameFilter(): ArkitFlameFilterParams {
	if (!cachedFilter) {
		cachedFilter = parseArkitFlameFilter(
			filterJson as Partial<ArkitFlameFilterParams> & {
				best?: Partial<ArkitFlameFilterParams>;
			},
		);
	}
	return cachedFilter;
}

/** Ready-to-use causal processor with bundled model + filter. */
export function createDefaultArkitFlameProcessor(
	params?: Partial<ArkitFlameFilterParams>,
): ArkitFlameProcessor {
	return new ArkitFlameProcessor({
		model: getDefaultArkit2FlameModel(),
		params: { ...getDefaultArkitFlameFilter(), ...params },
	});
}

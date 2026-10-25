import filterJson from "../assets/arkit2flame-filter.json";
import matJson from "../assets/arkit2flame-mat.json";
import {
	parseArkitFlameFilter,
	type ArkitFlameFilterParams,
} from "./filter";
import {
	parseArkit2FlameModel,
	type Arkit2FlameMatJson,
	type Arkit2FlameModel,
} from "./model";
import { ArkitFlameProcessor } from "./stream";

let cachedModel: Arkit2FlameModel | null = null;
let cachedFilter: ArkitFlameFilterParams | null = null;

/** Bundled fitted matrix (no network). */
export function getDefaultArkit2FlameModel(): Arkit2FlameModel {
	if (!cachedModel) {
		cachedModel = parseArkit2FlameModel(
			matJson as unknown as Arkit2FlameMatJson,
		);
	}
	return cachedModel;
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

export {
	ARKIT_BLENDSHAPES,
	ARKIT_COUNT,
	ARKIT_INDEX,
	SPEECH_BLENDSHAPES,
	SPEECH_BLENDSHAPE_SET,
	clamp01,
	recordToWeights,
	weightsToRecord,
	type ARKitBlendshape,
} from "./src/arkit";

export {
	FLAME_FIELDS,
	cloneKeyframe,
	normalizeKeyframe,
	wasmParamsToKeyframe,
	zeroKeyframe,
	type FlameField,
	type FlameKeyframe,
	type WasmFrameParams,
} from "./src/flame";

export {
	ARKIT2FLAME_CHANNELS,
	ARKIT2FLAME_COLS,
	ARKIT2FLAME_ROWS,
	DEFAULT_ARKIT_LAG_FRAMES,
	DEFAULT_JAW_SCALE,
	SILENCE_ENERGY_THRESH,
	ArkitWeightRing,
	arkitSpeechEnergy,
	arkitWeightHistoryToFlame,
	arkitWeightsToFlame,
	extractArkitRow,
	isArkitSilence,
	matVec,
	parseArkit2FlameModel,
	restKeyframe,
	type Arkit2FlameMatJson,
	type Arkit2FlameModel,
	type ArkitToFlameOptions,
} from "./src/model";

export {
	DEFAULT_ARKIT_FLAME_FILTER,
	SoftSpeechGate,
	arApproach,
	bakeArkitFlameFiltered,
	composeGatedKeyframe,
	decodeDelta,
	emptyRestKeyframe,
	gaussianSmooth1d,
	gaussianSmoothWeightSeries,
	parseArkitFlameFilter,
	pickFilterParams,
	sampleArkitWeightSeries,
	slewLimit,
	smoothstep,
	type ArkitFlameFilterParams,
	type BakeArkitFlameFilteredOptions,
} from "./src/filter";

export {
	ArkitFlameProcessor,
	type ArkitFlameProcessorOptions,
} from "./src/stream";

export {
	createDefaultArkitFlameProcessor,
	getDefaultArkit2FlameModel,
	getDefaultArkitFlameFilter,
} from "./src/defaults";

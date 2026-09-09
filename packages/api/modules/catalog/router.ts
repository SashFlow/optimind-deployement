import {
	listAudioClips,
	listLanguages,
	listModels,
	listProviders,
	listTimezones,
	listVoices,
} from "./procedures";

export const catalogRouter = {
	listProviders,
	listModels,
	listVoices,
	listAudioClips,
	listLanguages,
	listTimezones,
};

import {
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
	listLanguages,
	listTimezones,
};

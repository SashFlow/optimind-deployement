import {
	create,
	end,
	get,
	getTrialLink,
	list,
	patchLifecycle,
	postEvent,
	postReport,
	postToolCall,
	startEgressInternal,
	startSessionEgress,
	startTrialSession,
	uploadFileInternal,
} from "./procedures";

export const sessionsRouter = {
	list,
	get,
	create,
	end,
	getTrialLink,
	startTrialSession,
	startEgress: startSessionEgress,
	internal: {
		patchLifecycle,
		postEvent,
		postToolCall,
		postReport,
		startEgress: startEgressInternal,
		uploadFile: uploadFileInternal,
	},
};

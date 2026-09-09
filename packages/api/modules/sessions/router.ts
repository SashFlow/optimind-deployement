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
	startTrialSession,
	startEgressInternal,
	startSessionEgress,
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
	},
};

import {
	create,
	get,
	list,
	patchLifecycle,
	postEvent,
	postReport,
	postToolCall,
	startEgressInternal,
	startSessionEgress,
} from "./procedures";

export const sessionsRouter = {
	list,
	get,
	create,
	startEgress: startSessionEgress,
	internal: {
		patchLifecycle,
		postEvent,
		postToolCall,
		postReport,
		startEgress: startEgressInternal,
	},
};

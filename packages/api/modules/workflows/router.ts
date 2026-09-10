import {
	cancelRun,
	decideApproval,
	getApproval,
	getDefinition,
	getRun,
	listRuns,
	listVersions,
	publish,
	saveDraft,
	tickRunner,
	triggerTestRun,
	updateEnvVars,
} from "./procedures";

export const workflowsRouter = {
	getDefinition,
	saveDraft,
	updateEnvVars,
	publish,
	listVersions,
	listRuns,
	getRun,
	cancelRun,
	triggerTestRun,
	tickRunner,
	getApproval,
	decideApproval,
};

import {
	attachKnowledgeBase,
	create,
	detachKnowledgeBase,
	get,
	list,
	publish,
	update,
	updateConfig,
} from "./procedures";

export const agentsRouter = {
	list,
	get,
	create,
	update,
	updateConfig,
	publish,
	attachKnowledgeBase,
	detachKnowledgeBase,
};

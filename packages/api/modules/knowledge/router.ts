import {
	create,
	createDoc,
	get,
	ingestChunks,
	list,
	removeDocument,
	search,
	update,
} from "./procedures";

export const knowledgeRouter = {
	list,
	get,
	create,
	update,
	createDoc,
	ingestChunks,
	search,
	removeDocument,
};

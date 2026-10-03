import {
	create,
	createDoc,
	createUploadUrl,
	duplicate,
	get,
	ingestChunks,
	list,
	processDocument,
	removeDocument,
	search,
	update,
} from "./procedures";

export const knowledgeRouter = {
	list,
	get,
	create,
	duplicate,
	update,
	createUploadUrl,
	createDoc,
	processDocument,
	ingestChunks,
	search,
	removeDocument,
};

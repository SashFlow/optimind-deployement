import {
	create,
	createDoc,
	createUploadUrl,
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
	update,
	createUploadUrl,
	createDoc,
	processDocument,
	ingestChunks,
	search,
	removeDocument,
};

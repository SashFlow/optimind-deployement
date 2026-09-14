import { create, list, remove, update } from "./procedures";

export const toolsRouter = {
	list,
	create,
	update,
	delete: remove,
};

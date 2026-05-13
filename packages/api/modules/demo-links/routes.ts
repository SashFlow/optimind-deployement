import { listLink } from "./procedures/list";
import { updateLink , disableLink, enableLink } from "./procedures/update";
import { createLink } from "./procedures/create";
import { deleteLink } from "./procedures/delete";
import { validateToken, useSession } from "./procedures/session"

export const browserRouter = {
	list: listLink,
	update: updateLink,
    validate: validateToken,
    disable: disableLink,
    enable: enableLink,
    delete: deleteLink,
    create: createLink,
    reduceSession: useSession,
};

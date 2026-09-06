import { joinRelativeURL } from "ufo";

export function getAdminPath(path: string) {
	return joinRelativeURL("/app/settings", path);
}

import { config } from "@repo/config";
import { getMessagesForLocale } from "@repo/i18n";
import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./lib/locale-cookie";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
	let locale = await requestLocale;

	if (!locale) {
		locale = await getUserLocale();
	}

	if (!(routing.locales.includes(locale) && config.i18n.enabled)) {
		locale = routing.defaultLocale;
	}

	return {
		locale,
		messages: await getMessagesForLocale(locale),
	};
});

"use server";

import type { Locale } from "@repo/i18n";
import { revalidatePath } from "next/cache";
import { setLocaleCookie } from "./locale-cookie";

export async function updateLocale(locale: Locale) {
	await setLocaleCookie(locale);
	revalidatePath("/");
}

import { AdminSettingsNav } from "@saas/admin-settings/AdminSettingsNav";
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function SettingsAdminLayout({
	children,
}: PropsWithChildren) {
	const session = await getSession();
	if (!session) redirect("/auth/login");
	if (session.user?.role !== "admin") redirect("/app/dashboard");

	return <AdminSettingsNav>{children}</AdminSettingsNav>;
}

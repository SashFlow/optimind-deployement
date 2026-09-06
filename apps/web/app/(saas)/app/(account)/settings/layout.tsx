import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { AdminSettingsActionsProvider } from "@/components/saas/admin/AdminSettingsActions";
import { AdminSettingsNav } from "@/components/saas/admin/AdminSettingsNav";

export default async function SettingsLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (session.user.role !== "admin") {
		redirect("/app/dashboard");
	}

	return (
		<div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-auto pt-16">
			<AdminSettingsActionsProvider>
				<AdminSettingsNav>{children}</AdminSettingsNav>
			</AdminSettingsActionsProvider>
		</div>
	);
}

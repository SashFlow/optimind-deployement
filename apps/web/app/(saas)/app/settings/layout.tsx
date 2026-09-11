import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { AdminSettingsActionsProvider } from "@/context/AdminSettingsActionsProvider";
import { getSession } from "@/services/session";

export default async function SettingsLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (session.user.role !== "admin") {
		redirect("/app/dashboard");
	}

	return (
		<div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-auto">
			<AdminSettingsActionsProvider>
				{children}
			</AdminSettingsActionsProvider>
		</div>
	);
}

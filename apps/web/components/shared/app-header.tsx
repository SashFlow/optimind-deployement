"use client";

import { AppSidebarLogo } from "@components/shared/app-sidebar-logo";
import { AppUserMenu } from "@components/shared/app-user-menu";

export function AppHeader() {
	return (
		<header className="fixed top-0 right-0 left-0 z-30 flex h-24 w-full shrink-0 items-center justify-between gap-3 bg-transparent px-8 py-4">
			<div className="flex items-center gap-2">
				<AppSidebarLogo />
			</div>
			<AppUserMenu />
		</header>
	);
}

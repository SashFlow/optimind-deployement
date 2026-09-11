"use client";

import { AppCanvas } from "@components/shared/app-canvas";
import { AppHeaderProvider } from "@components/shared/app-header-provider";
import { AppSidebar } from "@components/shared/app-sidebar";
import {
	getAppSectionKey,
	ViewTransition,
} from "@components/shared/view-transition";
import { SidebarInset, SidebarProvider } from "@repo/ui/shadcn-sidebar";
import { usePathname } from "next/navigation";
import type { CSSProperties, PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
	const pathname = usePathname();
	const sectionKey = getAppSectionKey(pathname);

	return (
		<SidebarProvider
			open={false}
			onOpenChange={() => {}}
			className="relative isolate flex flex-col bg-transparent"
			style={
				{
					"--app-rail-size": "5.5rem",
					"--sidebar-width-icon": "4.5rem",
				} as CSSProperties
			}
		>
			<AppCanvas />
			<AppHeaderProvider>
				<div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<AppSidebar />
						<SidebarInset className="bg-transparent!">
							<div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-hidden p-2 pt-16 lg:pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
								<ViewTransition
									transitionKey={sectionKey}
									axis="y"
								>
									{children}
								</ViewTransition>
							</div>
						</SidebarInset>
					</div>
				</div>
			</AppHeaderProvider>
		</SidebarProvider>
	);
}

"use client";

import { AppCanvas } from "@components/shared/app-canvas";
import { AppHeader } from "@components/shared/app-header";
import { AppHeaderProvider } from "@components/shared/app-header-provider";
import { AppSidebar } from "@components/shared/app-sidebar";
import { SidebarInset, SidebarProvider } from "@repo/ui/shadcn-sidebar";
import type { CSSProperties, PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
	return (
		<SidebarProvider
			open={false}
			onOpenChange={() => { }}
			className="relative isolate flex flex-col bg-transparent"
			style={
				{
					"--app-rail-size": "7rem",
					"--sidebar-width-icon": "5rem",
				} as CSSProperties
			}
		>
			<AppCanvas />
			<AppHeaderProvider>
				<div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
					<AppHeader />
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<AppSidebar />
						<SidebarInset className="bg-transparent!">
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 pb-24 lg:pb-2">
								{children}
							</div>
						</SidebarInset>
					</div>
				</div>
			</AppHeaderProvider>
		</SidebarProvider>
	);
}

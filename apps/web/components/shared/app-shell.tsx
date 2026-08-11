"use client";

import { Separator } from "@repo/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@repo/ui/shadcn-sidebar";
import type { PropsWithChildren } from "react";
import { AppSidebar } from "./app-sidebar";
import { useState } from "react";

type AppShellProps = PropsWithChildren<{
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
}>;

export function AppShell({ user, children }: AppShellProps) {
	const [title, setTitle] = useState<string>("Playground");
	return (
		<SidebarProvider>
			<AppSidebar user={user} setTitle={setTitle} />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						{title}
					</span>
				</header>
				<div className="flex flex-1 flex-col p-4 pt-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

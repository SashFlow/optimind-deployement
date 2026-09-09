"use client";

import { NavMain } from "@components/shared/nav-main";
import { Sidebar, SidebarContent } from "@repo/ui/shadcn-sidebar";
import { cn } from "@repo/ui/utils";
import {
	AudioWaveformIcon,
	BookTextIcon,
	HomeIcon,
	SendHorizonalIcon,
	SettingsIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

export const workspaceNavItems = [
	{ title: "Dashboard", url: "/app/dashboard", icon: <HomeIcon /> },
	{ title: "Agents", url: "/app/agents", icon: <AudioWaveformIcon /> },
	{
		title: "Knowledge base",
		url: "/app/knowledge-base",
		icon: <BookTextIcon />,
	},
	{ title: "Campaigns", url: "/app/campaigns", icon: <SendHorizonalIcon /> },
	{
		title: "Settings",
		url: "/app/settings/users",
		matchHref: "/app/settings",
		icon: <SettingsIcon />,
	},
];

const pillClass = "rounded-full bg-sidebar shadow-sm ring-1 ring-black/5";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	return (
		<>
			<Sidebar
				collapsible="icon"
				variant="floating"
				className="top-1/2! bottom-auto! ml-5! h-auto! -translate-y-1/2! [&_[data-sidebar=sidebar]]:bg-transparent! [&_[data-sidebar=sidebar]]:border-transparent! [&_[data-sidebar=sidebar]]:shadow-none!"
				{...props}
			>
				<SidebarContent
					className={cn(
						pillClass,
						"no-scrollbar h-fit w-20! flex-none items-center overflow-visible",
					)}
				>
					<NavMain items={workspaceNavItems} />
				</SidebarContent>
			</Sidebar>

			<nav
				aria-label="Primary"
				className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
			>
				<div
					className={cn(
						pillClass,
						"pointer-events-auto flex h-auto w-auto max-w-[calc(100vw-2rem)] flex-row items-center overflow-x-auto",
					)}
				>
					<NavMain
						items={workspaceNavItems}
						orientation="horizontal"
					/>
				</div>
			</nav>
		</>
	);
}

"use client";

import { NavMain } from "@components/shared/nav-main";
import { cn } from "@repo/ui/utils";
import {
	Sidebar,
	SidebarContent,
} from "@repo/ui/shadcn-sidebar";
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
		url: "/app/settings/general",
		matchHref: "/app/settings",
		icon: <SettingsIcon />,
	},
];

const pillClass =
	"h-fit w-20! flex-none items-center rounded-full bg-sidebar shadow-sm ring-1 ring-black/5";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar
			collapsible="icon"
			variant="floating"
			className="top-1/2! bottom-auto! ml-5! h-auto! -translate-y-1/2! [&_[data-sidebar=sidebar]]:bg-transparent! [&_[data-sidebar=sidebar]]:border-transparent! [&_[data-sidebar=sidebar]]:shadow-none!"
			{...props}
		>
			<SidebarContent
				className={cn(pillClass, "no-scrollbar overflow-visible")}
			>
				<NavMain items={workspaceNavItems} />
			</SidebarContent>
		</Sidebar>
	);
}

"use client";

import { AppNotificationsButton } from "@components/shared/app-notifications-button";
import { AppSidebarLogo } from "@components/shared/app-sidebar-logo";
import { AppUserMenu } from "@components/shared/app-user-menu";
import { type NavItem, NavMain } from "@components/shared/nav-main";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "@repo/ui/shadcn-sidebar";
import { cn } from "@repo/ui/utils";
import {
	AudioWaveformIcon,
	BookTextIcon,
	ChevronLeftIcon,
	ClipboardListIcon,
	HashIcon,
	HomeIcon,
	ScrollTextIcon,
	SendHorizonalIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { usePathname } from "next/navigation";
import { type ComponentProps, useEffect, useState } from "react";

const RAIL_TRANSITION: Transition = {
	duration: 0.35,
	ease: [0.22, 1, 0.36, 1],
};

const settingsLinkItems: NavItem[] = [
	{
		title: "Numbers",
		url: "/app/settings/numbers",
		icon: <HashIcon />,
	},
	{
		title: "Background Jobs",
		url: "/app/settings/background-jobs",
		icon: <ClipboardListIcon />,
	},
	{
		title: "Audit Logs",
		url: "/app/settings/audit-log",
		icon: <ScrollTextIcon />,
	},
	{
		title: "Members",
		url: "/app/settings/member",
		icon: <UsersIcon />,
	},
];

const railPillClass = "rounded-3xl bg-sidebar shadow-sm ring-1 ring-black/5";

function isSettingsPath(pathname: string) {
	return (
		pathname === "/app/settings" || pathname.startsWith("/app/settings/")
	);
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const [settingsRailOpen, setSettingsRailOpen] = useState(() =>
		isSettingsPath(pathname),
	);

	useEffect(() => {
		if (isSettingsPath(pathname)) {
			setSettingsRailOpen(true);
		} else {
			setSettingsRailOpen(false);
		}
	}, [pathname]);

	const workspaceNavItems: NavItem[] = [
		{ title: "Dashboard", url: "/app/dashboard", icon: <HomeIcon /> },
		{ title: "Agents", url: "/app/agents", icon: <AudioWaveformIcon /> },
		{
			title: "Knowledge base",
			url: "/app/knowledge-base",
			icon: <BookTextIcon />,
		},
		{
			title: "Campaigns",
			url: "/app/campaigns",
			icon: <SendHorizonalIcon />,
		},
		{
			title: "Settings",
			matchHref: "/app/settings",
			icon: <SettingsIcon />,
			onClick: () => setSettingsRailOpen(true),
		},
	];

	const settingsNavItems: NavItem[] = [
		...settingsLinkItems,
		{
			title: "Back",
			icon: <ChevronLeftIcon />,
			onClick: () => setSettingsRailOpen(false),
		},
	];

	const activeItems = settingsRailOpen ? settingsNavItems : workspaceNavItems;
	const railKey = settingsRailOpen ? "settings" : "workspace";

	return (
		<>
			<Sidebar
				collapsible="icon"
				variant="floating"
				className="inset-y-0! top-0! bottom-0! h-svh! translate-y-0! py-4! [&_[data-sidebar=sidebar]]:bg-transparent! [&_[data-sidebar=sidebar]]:border-transparent! [&_[data-sidebar=sidebar]]:shadow-none!"
				{...props}
			>
				<SidebarHeader className="items-center p-2 pb-3">
					<AppSidebarLogo />
				</SidebarHeader>

				<SidebarContent className="no-scrollbar items-center justify-center overflow-visible px-1 group-data-[collapsible=icon]:overflow-visible!">
					<div
						className={cn(
							railPillClass,
							"relative flex w-16 flex-none flex-col items-center overflow-hidden",
						)}
					>
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={railKey}
								initial={{
									opacity: 0,
									x: settingsRailOpen ? 12 : -12,
								}}
								animate={{ opacity: 1, x: 0 }}
								exit={{
									opacity: 0,
									x: settingsRailOpen ? -12 : 12,
								}}
								transition={RAIL_TRANSITION}
								className="w-full"
							>
								<NavMain items={activeItems} />
							</motion.div>
						</AnimatePresence>
					</div>
				</SidebarContent>

				<SidebarFooter className="items-center gap-2 p-2 pt-3">
					<AppNotificationsButton />
					<AppUserMenu showMeta={false} align="start" side="right" />
				</SidebarFooter>
			</Sidebar>

			{/* Mobile: compact logo / account cluster (not a full header) */}
			<div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
				<div className="pointer-events-auto">
					<AppSidebarLogo className="size-12 [&_svg]:size-5!" />
				</div>
				<div className="pointer-events-auto flex items-center gap-1">
					<AppNotificationsButton className="size-11" />
					<AppUserMenu
						showMeta={false}
						align="end"
						side="bottom"
						className="size-11"
					/>
				</div>
			</div>

			<nav
				aria-label="Primary"
				className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
			>
				<div
					className={cn(
						railPillClass,
						"pointer-events-auto relative flex h-auto w-auto max-w-[calc(100vw-2rem)] flex-row items-center overflow-hidden shadow-lg shadow-black/15",
					)}
				>
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={railKey}
							initial={{
								opacity: 0,
								y: settingsRailOpen ? 8 : -8,
							}}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: settingsRailOpen ? -8 : 8 }}
							transition={RAIL_TRANSITION}
						>
							<NavMain
								items={activeItems}
								orientation="horizontal"
							/>
						</motion.div>
					</AnimatePresence>
				</div>
			</nav>
		</>
	);
}

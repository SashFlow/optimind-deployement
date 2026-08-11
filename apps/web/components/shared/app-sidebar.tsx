"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@repo/ui/shadcn-sidebar";
import {
	ChevronsUpDown,
	Database,
	FileText,
	LogOut,
	Share2,
	SquareTerminal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

const navItems = [
	{
		title: "Playground",
		url: "/app/playground",
		icon: SquareTerminal,
	},
	{
		title: "Logs",
		url: "/app/logs",
		icon: FileText,
	},
	{
		title: "Egress",
		url: "/app/browser",
		icon: Database,
	},
	{
		title: "Links",
		url: "/app/share",
		icon: Share2,
	},
] as const;

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
	setTitle: (title: string) => void;
};

export function AppSidebar({ user, setTitle, ...props }: AppSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="icon" variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip="Sashflow">
							<Link href="/">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<span className="size-2 rounded-full bg-signal" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-display text-base font-semibold">
										Sashflow
									</span>
									<span className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
										App
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Platform</SidebarGroupLabel>
					<SidebarMenu>
						{navItems.map((item) => {
							const isActive =
								pathname === item.url ||
								pathname.startsWith(`${item.url}/`);

							if (isActive) {
								setTitle(item.title);
							}

							return (
								<SidebarMenuItem key={item.url}>
									<SidebarMenuButton
										asChild
										isActive={isActive}
										tooltip={item.title}
									>
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
}) {
	const { isMobile } = useSidebar();
	const initials = user.name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	const onLogout = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					window.location.href = new URL(
						config.auth.redirectAfterLogout,
						window.location.origin,
					).toString();
				},
			},
		});
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage
									src={user.image ?? undefined}
									alt={user.name}
								/>
								<AvatarFallback className="rounded-lg">
									{initials || "SF"}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{user.name}
								</span>
								<span className="truncate text-xs">
									{user.email}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={user.image ?? undefined}
										alt={user.name}
									/>
									<AvatarFallback className="rounded-lg">
										{initials || "SF"}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user.name}
									</span>
									<span className="truncate text-xs">
										{user.email}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onLogout}>
							<LogOut className="size-4" />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

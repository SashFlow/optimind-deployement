"use client";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@repo/ui/shadcn-sidebar";
import { cn } from "@repo/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
	title: string;
	url: string;
	matchHref?: string;
	icon?: ReactNode;
};

const navButtonClass =
	"inline-flex items-center justify-center overflow-visible rounded-full p-0 text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-foreground data-[active=true]:text-background";

export function NavMain({
	items,
	orientation = "vertical",
}: {
	items: NavItem[];
	orientation?: "vertical" | "horizontal";
}) {
	const pathname = usePathname();
	const isHorizontal = orientation === "horizontal";

	if (isHorizontal) {
		return (
			<ul className="flex flex-row items-center gap-0.5 px-1.5 py-1">
				{items.map((item) => {
					const matchBase = item.matchHref ?? item.url;
					const isActive =
						pathname === matchBase ||
						pathname.startsWith(`${matchBase}/`);

					return (
						<li
							key={item.title}
							className="flex size-[4.5rem] shrink-0 items-center justify-center"
						>
							<Link
								href={item.url}
								data-active={isActive ? "true" : undefined}
								aria-current={isActive ? "page" : undefined}
								aria-label={item.title}
								className={cn(
									navButtonClass,
									"size-16 [&_svg]:size-7 [&_svg]:stroke-[1.75]",
								)}
							>
								{item.icon}
							</Link>
						</li>
					);
				})}
			</ul>
		);
	}

	return (
		<div className="flex w-full flex-col py-1">
			<SidebarMenu className="items-center gap-0.5">
				{items.map((item) => {
					const matchBase = item.matchHref ?? item.url;
					const isActive =
						pathname === matchBase ||
						pathname.startsWith(`${matchBase}/`);

					return (
						<SidebarMenuItem
							key={item.title}
							className="flex h-[4.5rem] w-full items-center justify-center"
						>
							<SidebarMenuButton
								asChild
								isActive={isActive}
								tooltip={item.title}
								className="size-16! justify-center overflow-visible rounded-full p-0! text-muted-foreground hover:text-foreground data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:hover:bg-foreground data-[active=true]:hover:text-background group-data-[collapsible=icon]:size-16! group-data-[collapsible=icon]:p-0! [&_svg]:size-7! [&_svg]:stroke-[1.75]"
							>
								<Link href={item.url}>
									{item.icon}
									<span className="sr-only">{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</div>
	);
}

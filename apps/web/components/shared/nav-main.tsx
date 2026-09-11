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

export type NavItem = {
	title: string;
	url?: string;
	matchHref?: string;
	icon?: ReactNode;
	onClick?: () => void;
};

const navIdleClass =
	"text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const navActiveClass =
	"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

const navButtonClass =
	"inline-flex size-12 items-center justify-center overflow-visible rounded-2xl p-0 [&_svg]:size-6 [&_svg]:stroke-[1.75]";

function isItemActive(pathname: string, item: NavItem): boolean {
	if (!item.url && !item.matchHref) {
		return false;
	}
	const matchBase = item.matchHref ?? item.url;
	if (!matchBase) {
		return false;
	}
	return pathname === matchBase || pathname.startsWith(`${matchBase}/`);
}

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
					const isActive = isItemActive(pathname, item);

					return (
						<li
							key={item.title}
							className="flex size-14 shrink-0 items-center justify-center"
						>
							{item.onClick && !item.url ? (
								<button
									type="button"
									onClick={item.onClick}
									aria-label={item.title}
									className={cn(navButtonClass, navIdleClass)}
								>
									{item.icon}
								</button>
							) : (
								<Link
									href={item.url ?? "#"}
									onClick={item.onClick}
									data-active={isActive ? "true" : undefined}
									aria-current={isActive ? "page" : undefined}
									aria-label={item.title}
									className={cn(
										navButtonClass,
										isActive
											? navActiveClass
											: navIdleClass,
									)}
								>
									{item.icon}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		);
	}

	return (
		<div className="flex w-full flex-col py-2">
			<SidebarMenu className="items-center gap-1">
				{items.map((item) => {
					const isActive = isItemActive(pathname, item);

					return (
						<SidebarMenuItem
							key={item.title}
							className="flex h-14 w-full items-center justify-center"
						>
							{item.onClick && !item.url ? (
								<SidebarMenuButton
									tooltip={item.title}
									onClick={item.onClick}
									className={cn(
										"size-12! justify-center overflow-visible rounded-2xl p-0! group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-0! [&_svg]:size-6! [&_svg]:stroke-[1.75]",
										navIdleClass,
									)}
								>
									{item.icon}
									<span className="sr-only">
										{item.title}
									</span>
								</SidebarMenuButton>
							) : (
								<SidebarMenuButton
									asChild
									isActive={isActive}
									tooltip={item.title}
									className={cn(
										"size-12! justify-center overflow-visible rounded-2xl p-0! group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-0! [&_svg]:size-6! [&_svg]:stroke-[1.75]",
										isActive
											? navActiveClass
											: navIdleClass,
									)}
								>
									<Link
										href={item.url ?? "#"}
										onClick={item.onClick}
									>
										{item.icon}
										<span className="sr-only">
											{item.title}
										</span>
									</Link>
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</div>
	);
}

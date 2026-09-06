"use client";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@repo/ui/shadcn-sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		matchHref?: string;
		icon?: ReactNode;
	}[];
}) {
	const pathname = usePathname();

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

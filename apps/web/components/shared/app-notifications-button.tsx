"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/utils";
import { BellIcon } from "lucide-react";

export function AppNotificationsButton({ className }: { className?: string }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"inline-flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground shadow-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
					className,
				)}
				aria-label="Notifications"
			>
				<BellIcon className="size-5 stroke-[1.75]" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="right"
				sideOffset={10}
				className="w-56"
			>
				<DropdownMenuLabel className="font-normal text-muted-foreground text-sm">
					No notifications
				</DropdownMenuLabel>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

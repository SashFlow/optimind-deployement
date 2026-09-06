"use client";

import { cn } from "@repo/ui/utils";
import {
	Building2Icon,
	ClipboardListIcon,
	HashIcon,
	ScrollTextIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

const tabs = [
	{ label: "Users", href: "/app/settings/users", icon: UsersIcon },
	{
		label: "Organizations",
		href: "/app/settings/organizations",
		icon: Building2Icon,
	},
	{
		label: "Jobs",
		href: "/app/settings/background-jobs",
		icon: ClipboardListIcon,
	},
	{ label: "Audit", href: "/app/settings/audit-log", icon: ScrollTextIcon },
	{ label: "Numbers", href: "/app/settings/numbers", icon: HashIcon },
];

export function AdminSettingsNav({ children }: PropsWithChildren) {
	const pathname = usePathname();

	return (
		<div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
			<div className="flex flex-wrap gap-2">
				{tabs.map((tab) => {
					const active =
						pathname === tab.href ||
						pathname.startsWith(`${tab.href}/`);
					const Icon = tab.icon;
					return (
						<Link
							key={tab.href}
							href={tab.href}
							className={cn(
								"inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-colors",
								active
									? "bg-foreground text-background"
									: "bg-white/80 text-muted-foreground ring-1 ring-black/5 hover:text-foreground",
							)}
						>
							<Icon className="size-4" />
							{tab.label}
						</Link>
					);
				})}
			</div>
			{children}
		</div>
	);
}

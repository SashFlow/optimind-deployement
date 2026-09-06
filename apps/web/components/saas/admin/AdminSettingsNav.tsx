"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import {
	Building2Icon,
	ClipboardListIcon,
	HashIcon,
	ScrollTextIcon,
	UsersIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";

const TABS = [
	{
		value: "users",
		label: "Users",
		href: "/app/settings/users",
		icon: UsersIcon,
	},
	{
		value: "organizations",
		label: "Organizations",
		href: "/app/settings/organizations",
		icon: Building2Icon,
	},
	{
		value: "jobs",
		label: "Jobs",
		href: "/app/settings/background-jobs",
		icon: ClipboardListIcon,
	},
	{
		value: "audit",
		label: "Audit",
		href: "/app/settings/audit-log",
		icon: ScrollTextIcon,
	},
	{
		value: "numbers",
		label: "Numbers",
		href: "/app/settings/numbers",
		icon: HashIcon,
	},
] as const;

type TabValue = (typeof TABS)[number]["value"];

function tabFromPathname(pathname: string): TabValue {
	const match = TABS.find(
		(tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
	);
	return match?.value ?? "users";
}

export function AdminSettingsNav({ children }: PropsWithChildren) {
	const pathname = usePathname();
	const router = useRouter();
	const active = tabFromPathname(pathname);

	function navigateToTab(value: string) {
		const next = TABS.find((tab) => tab.value === value);
		if (next) router.push(next.href);
	}

	return (
		<div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
			<div className="min-w-0">
				<Select value={active} onValueChange={navigateToTab}>
					<SelectTrigger
						aria-label="Settings section"
						className="w-full rounded-full bg-sidebar shadow-sm ring-1 ring-black/5 sm:hidden"
					>
						<SelectValue placeholder="Select section" />
					</SelectTrigger>
					<SelectContent>
						{TABS.map((tab) => {
							const Icon = tab.icon;
							return (
								<SelectItem key={tab.value} value={tab.value}>
									<span className="inline-flex items-center gap-2">
										<Icon className="size-4" />
										{tab.label}
									</span>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>

				<Tabs
					value={active}
					onValueChange={navigateToTab}
					className="hidden sm:block"
				>
					<TabsList className="h-auto w-fit gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground shadow-sm ring-1 ring-black/5">
						{TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = tab.value === active;
							return (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									data-active={isActive ? "true" : undefined}
									className={cn(
										"h-9 flex-none gap-2 rounded-full px-4 py-2 text-muted-foreground shadow-none transition-colors hover:text-foreground",
										"data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none",
										"data-[active=true]:bg-foreground data-[active=true]:text-background",
										"data-[state=active]:hover:bg-foreground data-[state=active]:hover:text-background",
									)}
									style={
										isActive
											? {
													backgroundColor:
														"var(--foreground)",
													color: "var(--background)",
												}
											: undefined
									}
								>
									<Icon className="size-4" />
									{tab.label}
								</TabsTrigger>
							);
						})}
					</TabsList>
				</Tabs>
			</div>
			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}

"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/breadcrumb";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import { useAppHeader } from "@components/shared/app-header-provider";
import { TabViewTransition } from "@components/shared/view-transition";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type PropsWithChildren } from "react";

const TABS = [
	{
		value: "dashboard",
		label: "Dashboard",
		href: (id: string) => `/app/campaigns/${id}/dashboard`,
	},
	{
		value: "workflow",
		label: "Workflow",
		href: (id: string) => `/app/campaigns/${id}/workflow`,
	},
	{
		value: "approvals",
		label: "Approvals",
		href: (id: string) => `/app/campaigns/${id}/approvals`,
	},
	{
		value: "logs",
		label: "Logs",
		href: (id: string) => `/app/campaigns/${id}/logs`,
	},
] as const;

type TabValue = (typeof TABS)[number]["value"];

function tabFromPathname(pathname: string, campaignId: string): TabValue {
	const base = `/app/campaigns/${campaignId}`;
	if (
		pathname === `${base}/workflow` ||
		pathname.startsWith(`${base}/workflow/`)
	) {
		return "workflow";
	}
	if (
		pathname === `${base}/approvals` ||
		pathname.startsWith(`${base}/approvals/`)
	) {
		return "approvals";
	}
	if (pathname === `${base}/logs` || pathname.startsWith(`${base}/logs/`)) {
		return "logs";
	}
	return "dashboard";
}

export function CampaignWorkspaceLayout({
	campaignId,
	children,
}: PropsWithChildren<{ campaignId: string }>) {
	const pathname = usePathname();
	const router = useRouter();
	const { setBreadcrumb } = useAppHeader();
	const active = tabFromPathname(pathname, campaignId);

	const campaignQuery = useQuery(
		orpc.campaigns.get.queryOptions({
			input: { id: campaignId },
		}),
	);

	const campaignName = campaignQuery.data?.campaign.name ?? "Campaign";

	useEffect(() => {
		setBreadcrumb(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/app/campaigns">Campaigns</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{campaignName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		);
		return () => setBreadcrumb(null);
	}, [campaignName, setBreadcrumb]);

	function navigateToTab(value: string) {
		const next = TABS.find((tab) => tab.value === value);
		if (next) {
			router.push(next.href(campaignId));
		}
	}

	return (
		<div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-4 py-4 md:gap-4 md:px-6 md:py-5">
			<div className="min-w-0 shrink-0">
				<Select value={active} onValueChange={navigateToTab}>
					<SelectTrigger
						aria-label="Campaign section"
						className="w-full rounded-full bg-sidebar shadow-sm ring-1 ring-black/5 sm:hidden"
					>
						<SelectValue placeholder="Select section" />
					</SelectTrigger>
					<SelectContent>
						{TABS.map((tab) => (
							<SelectItem key={tab.value} value={tab.value}>
								{tab.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Tabs
					value={active}
					onValueChange={navigateToTab}
					className="hidden sm:block"
				>
					<TabsList className="h-auto w-fit gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground shadow-sm ring-1 ring-black/5">
						{TABS.map((tab) => {
							const isActive = active === tab.value;
							return (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className={cn(
										"h-9 flex-none gap-2 rounded-full px-4 py-2 shadow-none transition-colors",
										isActive
											? "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{tab.label}
								</TabsTrigger>
							);
						})}
					</TabsList>
				</Tabs>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<TabViewTransition
					activeValue={active}
					orderedValues={TABS.map((tab) => tab.value)}
				>
					{children}
				</TabViewTransition>
			</div>
		</div>
	);
}

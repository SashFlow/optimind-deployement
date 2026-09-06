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
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type PropsWithChildren } from "react";

const TABS = [
	{
		value: "configure",
		label: "Configure",
		href: (id: string) => `/app/agents/${id}/configure`,
	},
	{
		value: "monitor",
		label: "Monitor",
		href: (id: string) => `/app/agents/${id}/monitor`,
	},
	{
		value: "logs",
		label: "Logs",
		href: (id: string) => `/app/agents/${id}/logs`,
	},
	{
		value: "access-control",
		label: "Access Control",
		href: (id: string) => `/app/agents/${id}/access-control`,
	},
] as const;

type TabValue = (typeof TABS)[number]["value"];

function tabFromPathname(pathname: string, agentId: string): TabValue {
	const base = `/app/agents/${agentId}`;
	if (
		pathname === `${base}/access-control` ||
		pathname.startsWith(`${base}/access-control/`)
	) {
		return "access-control";
	}
	if (
		pathname === `${base}/monitor` ||
		pathname.startsWith(`${base}/monitor/`)
	) {
		return "monitor";
	}
	if (pathname === `${base}/logs` || pathname.startsWith(`${base}/logs/`)) {
		return "logs";
	}
	return "configure";
}

export function AgentWorkspaceLayout({
	agentId,
	children,
}: PropsWithChildren<{ agentId: string }>) {
	const pathname = usePathname();
	const router = useRouter();
	const { setBreadcrumb } = useAppHeader();
	const active = tabFromPathname(pathname, agentId);

	const agentQuery = useQuery(
		orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
	);

	const agentName = agentQuery.data?.agent.name ?? "Agent";

	useEffect(() => {
		setBreadcrumb(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/app/agents">Agents</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{agentName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		);
		return () => setBreadcrumb(null);
	}, [agentName, setBreadcrumb]);

	function navigateToTab(value: string) {
		const next = TABS.find((tab) => tab.value === value);
		if (next) {
			router.push(next.href(agentId));
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-6 md:px-6">
			<div className="min-w-0">
				<Select value={active} onValueChange={navigateToTab}>
					<SelectTrigger
						aria-label="Agent section"
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

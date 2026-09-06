"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/breadcrumb";
import { cn } from "@repo/ui/utils";
import { useAppHeader } from "@components/shared/app-header-provider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type PropsWithChildren } from "react";

const tabs = [
	{ label: "Configure", segment: "configure" },
	{ label: "Monitor", segment: "monitor" },
	{ label: "Logs", segment: "logs" },
	{ label: "Access Control", segment: "access-control" },
] as const;

export function AgentWorkspaceLayout({
	agentId,
	children,
}: PropsWithChildren<{ agentId: string }>) {
	const pathname = usePathname();
	const { setBreadcrumb } = useAppHeader();

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

	return (
		<div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-6 md:px-6">
			<div className="flex flex-wrap gap-2">
				{tabs.map((tab) => {
					const href = `/app/agents/${agentId}/${tab.segment}`;
					const active = pathname.startsWith(href);
					return (
						<Link
							key={tab.segment}
							href={href}
							className={cn(
								"rounded-full px-4 py-2 font-medium text-sm transition-colors",
								active
									? "bg-foreground text-background"
									: "bg-white/80 text-muted-foreground ring-1 ring-black/5 hover:text-foreground",
							)}
						>
							{tab.label}
						</Link>
					);
				})}
			</div>
			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}

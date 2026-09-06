"use client";

import { Button } from "@repo/ui/button";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	CheckCircle2Icon,
	ClockIcon,
	PhoneIcon,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "./dashboard/StatCard";

export function Dashboard() {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id;
	const orgName = activeOrganization?.name ?? "your workspace";

	const metricsQuery = useQuery({
		...orpc.metrics.list.queryOptions({
			input: {
				organizationId: organizationId ?? "",
			},
		}),
		enabled: !!organizationId,
	});

	const byAgentQuery = useQuery({
		...orpc.metrics.byAgent.queryOptions({
			input: {
				organizationId: organizationId ?? "",
			},
		}),
		enabled: !!organizationId,
	});

	const metrics = metricsQuery.data?.metrics ?? [];
	const agentRows = byAgentQuery.data?.rows ?? [];
	const totalSessions = metrics.length;
	const agentCount = agentRows.length;

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="space-y-1">
					<h1 className="font-semibold text-2xl tracking-tight">
						Welcome Back!
					</h1>
					<p className="text-muted-foreground text-sm">
						Here&apos;s what&apos;s happening across {orgName}.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						className="rounded-full border-border/60 bg-white/80 shadow-xs"
						asChild
					>
						<Link href="#analytics">Full analytics</Link>
					</Button>
					<Button className="rounded-full" asChild>
						<Link href="/app/agents">Review sessions</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total metrics"
					value={totalSessions.toLocaleString()}
					icon={PhoneIcon}
				/>
				<StatCard
					title="Agents with usage"
					value={agentCount.toLocaleString()}
					icon={ActivityIcon}
				/>
				<StatCard
					title="Org status"
					value={activeOrganization ? "Active" : "—"}
					icon={CheckCircle2Icon}
				/>
				<StatCard
					title="Loaded"
					value={metricsQuery.isLoading ? "…" : "Ready"}
					icon={ClockIcon}
				/>
			</div>

			<section
				id="analytics"
				className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5"
			>
				<h2 className="mb-2 font-semibold text-lg tracking-tight">
					Usage snapshot
				</h2>
				<p className="mb-4 text-muted-foreground text-sm">
					Aggregated from organization usage metrics.
				</p>
				{agentRows.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No usage data yet. Metrics will appear as sessions run.
					</p>
				) : (
					<ul className="space-y-2">
						{agentRows.slice(0, 8).map((row: { agentId?: string | null; _sum?: { value?: unknown }; metric?: string }) => (
							<li
								key={`${row.agentId}-${row.metric}`}
								className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm"
							>
								<span className="truncate font-medium">
									{row.agentId ?? "Unassigned"} · {row.metric}
								</span>
								<span className="text-muted-foreground">
									{String(row._sum?.value ?? "—")}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</section>
	);
}

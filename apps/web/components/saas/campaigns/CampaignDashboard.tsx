"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

export function CampaignDashboard({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	const campaignQuery = useQuery(
		orpc.campaigns.get.queryOptions({ input: { id: campaignId } }),
	);
	const runsQuery = useQuery(
		orpc.workflows.listRuns.queryOptions({
			input: { campaignId, limit: 8 },
		}),
	);
	const metricsQuery = useQuery({
		...orpc.metrics.byCampaign.queryOptions({
			input: { organizationId, campaignId },
		}),
		enabled: !!organizationId,
	});

	const updateMutation = useMutation(
		orpc.campaigns.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.campaigns.get.key({ input: { id: campaignId } }),
				});
				toast.success("Campaign updated");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const tickMutation = useMutation(
		orpc.workflows.tickRunner.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.listRuns.key({
						input: { campaignId },
					}),
				});
				toast.success(
					`Runner tick: ${data.processed} runs, ${data.resumed} waits, ${data.scheduled ?? 0} scheduled`,
				);
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const campaign = campaignQuery.data?.campaign;
	const runs = runsQuery.data?.runs ?? [];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">
						{campaign?.name ?? "Campaign"}
					</h1>
					<p className="text-sm text-muted-foreground">
						{campaign?.description || "Workflow campaign dashboard"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={campaign?.status ?? "DRAFT"}
						onValueChange={(status) =>
							updateMutation.mutate({
								id: campaignId,
								status: status as
									| "DRAFT"
									| "ACTIVE"
									| "PAUSED"
									| "COMPLETED"
									| "ARCHIVED",
							})
						}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(
								[
									"DRAFT",
									"ACTIVE",
									"PAUSED",
									"COMPLETED",
									"ARCHIVED",
								] as const
							).map((s) => (
								<SelectItem key={s} value={s}>
									{s}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						onClick={() => tickMutation.mutate({})}
					>
						Tick runner
					</Button>
					<Button asChild size="sm">
						<Link href={`/app/campaigns/${campaignId}/workflow`}>
							Edit workflow
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Contacts"
					value={String(campaign?._count?.contacts ?? 0)}
				/>
				<StatCard
					title="Sessions"
					value={String(campaign?._count?.sessions ?? 0)}
				/>
				<StatCard
					title="Workflow runs"
					value={String(runsQuery.data?.total ?? runs.length)}
				/>
				<StatCard
					title="Metrics points"
					value={String(metricsQuery.data?.rows?.length ?? 0)}
				/>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Recent runs</CardTitle>
					<Button asChild variant="ghost" size="sm">
						<Link href={`/app/campaigns/${campaignId}/logs`}>View logs</Link>
					</Button>
				</CardHeader>
				<CardContent className="space-y-2">
					{runs.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No runs yet. Publish a workflow and trigger a test or webhook.
						</p>
					)}
					{runs.map((run) => (
						<div
							key={run.id}
							className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
						>
							<div className="min-w-0">
								<div className="truncate font-medium">{run.id}</div>
								<div className="text-xs text-muted-foreground">
									{run.triggerType} ·{" "}
									{new Date(run.createdAt).toLocaleString()}
									{run.workflowVersion
										? ` · v${run.workflowVersion.version}`
										: ""}
								</div>
							</div>
							<Badge variant="secondary">{run.status}</Badge>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({ title, value }: { title: string; value: string }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-semibold">{value}</div>
			</CardContent>
		</Card>
	);
}

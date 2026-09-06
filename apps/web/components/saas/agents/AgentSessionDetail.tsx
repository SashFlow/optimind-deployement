"use client";

import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import { useSessionDetailQuery } from "./lib/hooks";

function formatDateTime(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "medium",
	}).format(date);
}

function formatDuration(ms: number | null | undefined) {
	if (ms == null || ms < 0) return "—";
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

export function AgentSessionDetail({
	agentId,
	sessionId,
}: {
	agentId: string;
	sessionId: string;
	organizationId?: string;
}) {
	const sessionQuery = useSessionDetailQuery(sessionId);
	const agentQuery = useQuery(
		orpc.agents.get.queryOptions({
			input: { id: agentId },
		}),
	);

	if (sessionQuery.isLoading) {
		return <LoadingState size="lg" />;
	}

	if (sessionQuery.isError || !sessionQuery.data?.session) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load session.
			</p>
		);
	}

	const session = sessionQuery.data.session as {
		id: string;
		status: string;
		channel?: string;
		livekitRoomName: string;
		startedAt?: string | Date | null;
		endedAt?: string | Date | null;
		durationMs?: number | null;
		errorMessage?: string | null;
		events?: Array<{
			id: string;
			type?: string;
			createdAt?: string | Date;
		}>;
		transcript?: { text?: string | null } | null;
		egressJobs?: Array<{ id: string; status?: string }>;
	};

	const events = session.events ?? [];
	const agentName = agentQuery.data?.agent.name ?? "Agent";

	return (
		<section className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden px-4 py-6 md:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-sm">
						<Link
							href={`/app/agents/${agentId}/logs`}
							className="underline-offset-2 hover:underline"
						>
							{agentName} logs
						</Link>
					</p>
					<h1 className="font-semibold text-xl tracking-tight">
						Session {session.id.slice(0, 10)}
					</h1>
				</div>
				<span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
					{session.status}
				</span>
			</div>

			<Tabs defaultValue="overview" className="min-h-0 flex-1">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="events">Events</TabsTrigger>
					<TabsTrigger value="transcript">Transcript</TabsTrigger>
					<TabsTrigger value="egress">Egress</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Channel
								</CardTitle>
							</CardHeader>
							<CardContent>
								{session.channel ?? "WEB"}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Started
								</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDateTime(session.startedAt)}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">Ended</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDateTime(session.endedAt)}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Duration
								</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDuration(session.durationMs)}
							</CardContent>
						</Card>
					</div>
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle className="text-sm">Room</CardTitle>
						</CardHeader>
						<CardContent className="font-mono text-xs">
							{session.livekitRoomName}
						</CardContent>
					</Card>
					{session.errorMessage ? (
						<Card className="rounded-3xl border-destructive/40">
							<CardHeader>
								<CardTitle className="text-sm text-destructive">
									Error
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm">
								{session.errorMessage}
							</CardContent>
						</Card>
					) : null}
				</TabsContent>

				<TabsContent value="events" className="mt-4">
					{events.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No events.
						</p>
					) : (
						<ul className="space-y-2">
							{events.map((event) => (
								<li
									key={event.id}
									className="rounded-xl border px-3 py-2 text-sm"
								>
									<span className="font-medium">
										{event.type ?? "event"}
									</span>
									<span className="ml-2 text-muted-foreground text-xs">
										{formatDateTime(event.createdAt)}
									</span>
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="transcript" className="mt-4">
					{session.transcript?.text ? (
						<pre className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm">
							{session.transcript.text}
						</pre>
					) : (
						<p className="text-sm text-muted-foreground">
							No transcript available.
						</p>
					)}
				</TabsContent>

				<TabsContent value="egress" className="mt-4">
					{(session.egressJobs ?? []).length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No egress jobs.
						</p>
					) : (
						<ul className="space-y-2">
							{(session.egressJobs ?? []).map((job) => (
								<li
									key={job.id}
									className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
								>
									<span className="font-mono text-xs">
										{job.id.slice(0, 10)}
									</span>
									<span>{job.status ?? "unknown"}</span>
								</li>
							))}
						</ul>
					)}
					<div className="mt-4">
						<Button type="button" variant="outline" asChild>
							<Link href={`/app/agents/${agentId}/logs`}>
								Back to logs
							</Link>
						</Button>
					</div>
				</TabsContent>
			</Tabs>
		</section>
	);
}

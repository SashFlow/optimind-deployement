"use client";

import { Button } from "@repo/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import type { AgentSessionRow } from "./lib/types";

const ACTIVE_STATUSES = new Set(["QUEUED", "ACTIVE"]);

export function AgentActiveSessions({
	sessions,
	agentId,
}: {
	sessions: AgentSessionRow[];
	agentId: string;
	organizationId?: string;
}) {
	const activeSessions = sessions.filter((s) =>
		ACTIVE_STATUSES.has(s.status),
	);

	return (
		<Card className="rounded-3xl border shadow-sm ring-1 ring-black/5">
			<CardHeader>
				<CardTitle>Active sessions</CardTitle>
				<CardDescription>
					Live and in-progress sessions. Refreshes every 10 seconds.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{activeSessions.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No active sessions.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Session</TableHead>
								<TableHead>Started</TableHead>
								<TableHead>Channel</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{activeSessions.map((session) => (
								<TableRow key={session.id}>
									<TableCell>
										<Link
											href={`/app/agents/${agentId}/logs/${session.id}`}
											className="font-mono text-xs underline-offset-2 hover:underline"
										>
											{session.id.slice(0, 8)}
										</Link>
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{session.startedAt
											? formatDistanceToNow(
													new Date(session.startedAt),
													{ addSuffix: true },
												)
											: "—"}
									</TableCell>
									<TableCell className="text-sm">
										{session.channel}
									</TableCell>
									<TableCell className="text-sm">
										{session.status}
									</TableCell>
									<TableCell className="text-right">
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() =>
												toast.message(
													"End session is not available via ORPC yet",
												)
											}
										>
											End
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

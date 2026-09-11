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
import {
	PAGE_SIZE,
	Pagination,
	useClientPagination,
} from "@/components/saas/shared/Pagination";
import { useEndSessionMutation } from "./lib/hooks";
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
	const endSession = useEndSessionMutation();
	const activeSessions = sessions.filter((s) =>
		ACTIVE_STATUSES.has(s.status),
	);
	const { currentPage, setCurrentPage, pageItems, totalItems } =
		useClientPagination(activeSessions);

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
					<p className="py-8 text-center text-sm text-muted-foreground">
						No active sessions.
					</p>
				) : (
					<div className="overflow-hidden rounded-xl border">
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
								{pageItems.map((session) => {
									const ending =
										endSession.isPending &&
										endSession.variables?.id === session.id;
									return (
										<TableRow key={session.id}>
											<TableCell>
												<Link
													href={`/app/agents/${agentId}/session/${session.id}`}
													className="font-mono text-xs underline-offset-2 hover:underline"
												>
													{session.id.slice(0, 8)}
												</Link>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{session.startedAt
													? formatDistanceToNow(
															new Date(
																session.startedAt,
															),
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
													disabled={ending}
													onClick={() =>
														endSession.mutate({
															id: session.id,
														})
													}
												>
													{ending ? "Ending…" : "End"}
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<footer className="border-t px-5 py-3">
							<Pagination
								totalItems={totalItems}
								itemsPerPage={PAGE_SIZE}
								currentPage={currentPage}
								onChangeCurrentPage={setCurrentPage}
							/>
						</footer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

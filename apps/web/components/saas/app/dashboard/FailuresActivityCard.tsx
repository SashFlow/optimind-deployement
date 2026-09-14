"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangleIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardStats } from "@/services/api/types";

type Failure = NonNullable<DashboardStats["failures"]>[number];

function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatReason(value: string) {
	return value.replaceAll("_", " ").toLowerCase();
}

export function FailuresActivityCard({ failures }: { failures: Failure[] }) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return failures
			.filter((f) => {
				if (!q) {
					return true;
				}
				const haystack = [
					f.agentName,
					f.endReason,
					f.errorCode,
					f.errorMessage,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				return haystack.includes(q);
			})
			.slice(0, 12);
	}, [failures, query]);

	return (
		<Card className="shadow-xs">
			<CardHeader className="space-y-4 pb-3">
				<CardTitle className="text-base font-bold leading-none">
					Recent failures
				</CardTitle>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search..."
						className="h-10 rounded-full pl-9"
					/>
				</div>
			</CardHeader>
			<CardContent>
				{filtered.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No failures match your filters.
					</p>
				) : (
					<ul className="relative">
						{filtered.map((failure, index) => {
							const pill =
								failure.errorCode ||
								failure.endReason ||
								"error";
							const detail =
								failure.errorMessage ||
								(failure.endReason
									? `Session ended with ${formatReason(failure.endReason)}`
									: "Session failed");

							return (
								<li
									key={failure.id}
									className="relative flex gap-3 pb-6 last:pb-0"
								>
									{index < filtered.length - 1 ? (
										<span
											aria-hidden
											className="absolute top-9 bottom-0 left-4 w-px bg-border"
										/>
									) : null}
									<div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tracking-wide text-muted-foreground">
										{initials(failure.agentName)}
									</div>
									<div className="min-w-0 flex-1 pt-0.5">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold">
													{failure.agentName}
												</p>
												<p className="mt-0.5 text-sm text-muted-foreground">
													{detail}
												</p>
												<span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground">
													<AlertTriangleIcon className="size-3.5 shrink-0 text-destructive" />
													<span className="truncate font-medium">
														{pill}
													</span>
												</span>
											</div>
											<span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
												{formatDistanceToNow(
													new Date(failure.createdAt),
													{ addSuffix: true },
												)}
											</span>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

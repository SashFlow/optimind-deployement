"use client";

import { Card, CardContent, CardHeader } from "@repo/ui/card";
import type { AnalyticsCountryRank } from "@/services/api/types";

import { MetricHelpTitle } from "./MetricHelpTitle";

export function TopCountriesCard({
	countries,
	unavailable,
}: {
	countries: AnalyticsCountryRank[];
	unavailable?: boolean;
}) {
	return (
		<Card className="h-full shadow-xs">
			<CardHeader className="pb-2">
				<MetricHelpTitle
					title="Top countries"
					hint="Participant locations from LiveKit session details."
				/>
			</CardHeader>
			<CardContent>
				{unavailable ? (
					<p className="text-sm text-muted-foreground">
						Analytics unavailable
					</p>
				) : countries.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No data yet.
					</p>
				) : (
					<ul className="min-w-0">
						{countries.map((row, index) => (
							<li
								key={`${row.rank}-${row.name}`}
								className={
									index < countries.length - 1
										? "border-b border-border/60"
										: undefined
								}
							>
								<div className="flex items-center gap-2 py-2.5 text-sm">
									<span className="w-6 shrink-0 tabular-nums text-muted-foreground">
										{row.rank}
									</span>
									<span className="min-w-0 flex-1 truncate">
										{row.name}
									</span>
									<span className="shrink-0 font-semibold tabular-nums">
										{row.count}
									</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

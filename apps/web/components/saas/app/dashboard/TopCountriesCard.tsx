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
		<Card className="h-full">
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
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left text-xs text-muted-foreground">
								<th className="pb-2 font-medium">#</th>
								<th className="pb-2 font-medium">Name</th>
								<th className="pb-2 text-right font-medium">
									Count
								</th>
							</tr>
						</thead>
						<tbody>
							{countries.map((row) => (
								<tr
									key={`${row.rank}-${row.name}`}
									className="border-b last:border-0"
								>
									<td className="py-2 tabular-nums text-muted-foreground">
										{row.rank}
									</td>
									<td className="py-2">{row.name}</td>
									<td className="py-2 text-right font-medium tabular-nums">
										{row.count}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardContent>
		</Card>
	);
}

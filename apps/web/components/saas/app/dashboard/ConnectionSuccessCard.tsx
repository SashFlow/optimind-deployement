"use client";

import { StatCard } from "@/components/saas/app/dashboard/StatCard";

export function ConnectionSuccessCard({
	pct,
	unavailable,
}: {
	pct: number | null;
	unavailable?: boolean;
}) {
	const rate =
		unavailable || pct == null ? 0 : Math.max(0, Math.min(100, pct)) / 100;
	const display = unavailable || pct == null ? "—" : `${pct.toFixed(1)}%`;
	const donutLabel = unavailable || pct == null ? "—" : `${pct.toFixed(0)}%`;

	return (
		<StatCard
			title="Connection success"
			subtitle="LiveKit connection attempts"
			value={display}
			variant="donut"
			color="var(--chart-1)"
			progress={rate}
			donutLabel={donutLabel}
			donutCaption="Success"
		/>
	);
}

"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import {
	KpiCard,
	type SparklinePoint,
} from "@/components/saas/shared/KpiCard";

const PLACEHOLDER_SPARKLINE: SparklinePoint[] = Array.from(
	{ length: 12 },
	() => ({ value: 100 }),
);

const HEALTH_METRICS = [
	{ title: "Agent Queue" },
	{ title: "Model Response" },
	{ title: "Telephony" },
] as const;

type HealthStatusDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function HealthStatusDialog({
	open,
	onOpenChange,
}: HealthStatusDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Health</DialogTitle>
					<DialogDescription>
						Service uptime across core platform components.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 sm:grid-cols-3">
					{HEALTH_METRICS.map((metric) => (
						<KpiCard
							key={metric.title}
							variant="insight"
							title={metric.title}
							value="100%"
							tone="positive"
							status={{ emphasis: "100%", label: "uptime" }}
							sparkline={PLACEHOLDER_SPARKLINE}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

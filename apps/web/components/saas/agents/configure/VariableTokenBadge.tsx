"use client";

import { Badge } from "@repo/ui/badge";
import { cn } from "@repo/ui/utils";

type VariableTokenBadgeProps = {
	name: string;
	kind?: "variable" | "secret";
	className?: string;
};

export function VariableTokenBadge({
	name,
	kind = "variable",
	className,
}: VariableTokenBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"h-auto px-1.5 py-0 font-mono text-[11px] font-normal leading-5",
				kind === "secret"
					? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
					: "border-primary/25 bg-primary/10 text-primary",
				className,
			)}
		>
			{`{{${name}}}`}
		</Badge>
	);
}

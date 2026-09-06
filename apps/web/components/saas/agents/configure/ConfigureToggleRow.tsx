"use client";

import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/utils";

export function ConfigureToggleRow({
	label,
	description,
	checked,
	onCheckedChange,
	className,
}: {
	label: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-start justify-between gap-4 border-b py-3 last:border-b-0",
				className,
			)}
		>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{label}</p>
				{description ? (
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			<Switch checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}

"use client";

import { Switch } from "@repo/ui/switch";
import type { ReactNode } from "react";

export function ConfigureSectionToggle({
	title,
	description,
	checked,
	onCheckedChange,
	children,
}: {
	title: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children?: ReactNode;
}) {
	return (
		<div className="space-y-4">
			<label className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold">{title}</h3>
					{description ? (
						<p className="mt-0.5 text-xs text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
				<Switch
					checked={checked}
					onCheckedChange={onCheckedChange}
					className="mt-0.5 shrink-0"
				/>
			</label>
			{checked ? children : null}
		</div>
	);
}

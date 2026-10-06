"use client";

import { cn } from "@repo/ui/utils";
import type { HTMLAttributes, ReactNode } from "react";
import { useSpatiusAvatarContext } from "@/components/saas/agents/spatius-avatar/spatius-avatar-context";

export interface SpatiusAvatarLoadingProps
	extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
}

export function SpatiusAvatarLoading({
	className,
	children,
	...props
}: SpatiusAvatarLoadingProps) {
	const { isLoading, status } = useSpatiusAvatarContext();

	const showOverlay =
		isLoading ||
		status === "idle" ||
		status === "initializing" ||
		status === "connecting";

	if (!showOverlay) {
		return null;
	}

	return (
		<div
			className={cn(
				"absolute inset-0 z-10 flex items-center justify-center bg-background/60 p-6 backdrop-blur-md",
				className,
			)}
			{...props}
		>
			{children ?? (
				<div className="w-full max-w-xs rounded-2xl border border-border/70 bg-card/95 p-5 text-card-foreground shadow-xl">
					<div className="flex items-center gap-3">
						<div className="size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
						<div>
							<p className="text-sm font-medium">Connecting…</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

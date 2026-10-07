import { cn } from "@repo/ui/utils";
import type { ReactNode } from "react";

export default function PipStage({
	children,
	className,
	/** Internal size multiplier for SDKs that size a canvas to the container. */
	renderScale = 1,
}: {
	children: ReactNode;
	className?: string;
	renderScale?: number;
}) {
	const scale = Math.max(1, renderScale);

	return (
		<div
			className={cn(
				"relative aspect-square overflow-hidden border bg-slate-200",
				// Default size; callers can override with h-*.
				!className?.includes("h-") && "h-36",
				className,
			)}
		>
			{scale === 1 ? (
				children
			) : (
				<div
					className="absolute top-0 left-0 origin-top-left rounded-lg"
					style={{
						width: `${100 * scale}%`,
						height: `${100 * scale}%`,
						transform: `scale(${1 / scale})`,
					}}
				>
					{children}
				</div>
			)}
		</div>
	);
}

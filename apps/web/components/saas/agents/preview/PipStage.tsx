import { cn } from "@repo/ui/utils";
import type { ReactNode } from "react";

export default function PipStage({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative h-20 w-28 overflow-hidden border bg-white",
				className,
			)}
		>
			{children}
		</div>
	);
}

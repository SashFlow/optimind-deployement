import { cn } from "@repo/ui/utils";
import type { ReactNode } from "react";

export default function MainStage({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-xl bg-black shadow-sm",
				className,
			)}
		>
			{children}
		</div>
	);
}

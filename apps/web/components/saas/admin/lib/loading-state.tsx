import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/utils";

export function LoadingState({
	className,
	size = "default",
}: {
	className?: string;
	size?: "default" | "lg";
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-center p-6",
				size === "lg" && "py-20",
				className,
			)}
		>
			<Spinner className={size === "lg" ? "h-10 w-10" : undefined} />
		</div>
	);
}

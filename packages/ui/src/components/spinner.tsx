import { Loader2Icon } from "lucide-react";
import { cn } from "../utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<Loader2Icon
			data-slot="spinner"
			role="status"
			aria-label="Loading"
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

function LoadingState({
	className,
	size = "default",
}: {
	className?: string;
	size?: "default" | "lg";
}) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("flex items-center justify-center p-6", className)}
		>
			<Spinner
				className={cn(
					"text-muted-foreground",
					size === "lg" ? "size-6" : "size-4",
				)}
			/>
		</div>
	);
}

export { LoadingState, Spinner };

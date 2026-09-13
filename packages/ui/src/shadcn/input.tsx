import * as React from "react";

import { cn } from "../utils";

export type InputProps = React.ComponentPropsWithRef<"input">;

const Input: React.FC<InputProps> = ({
	className,
	type = "text",
	...props
}) => {
	return (
		<input
			type={type}
			className={cn(
				"border-border bg-background file:text-foreground placeholder:text-muted-foreground flex h-10 w-full rounded-xl border px-3.5 py-2 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
};

Input.displayName = "Input";

export { Input };

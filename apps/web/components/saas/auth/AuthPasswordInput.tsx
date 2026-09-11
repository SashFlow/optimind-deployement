"use client";

import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { authInputClassName } from "./AuthCard";

export function AuthPasswordInput({
	className,
	...props
}: ComponentProps<typeof Input>) {
	const [visible, setVisible] = useState(false);

	return (
		<div className="relative">
			<Input
				type={visible ? "text" : "password"}
				className={cn(authInputClassName, "pr-11", className)}
				{...props}
			/>
			<button
				type="button"
				tabIndex={-1}
				aria-label={visible ? "Hide password" : "Show password"}
				className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
				onClick={() => setVisible((value) => !value)}
			>
				{visible ? (
					<EyeOff className="size-4" />
				) : (
					<Eye className="size-4" />
				)}
			</button>
		</div>
	);
}

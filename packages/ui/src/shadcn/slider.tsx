"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "../utils";

const Slider: React.FC<
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
> = ({ className, ...props }) => (
	<SliderPrimitive.Root
		className={cn(
			"relative flex w-full touch-none items-center select-none",
			className,
		)}
		{...props}
	>
		<SliderPrimitive.Track className="bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full">
			<SliderPrimitive.Range className="bg-primary absolute h-full" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="border-primary/50 bg-background focus-visible:ring-ring block h-4 w-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" />
	</SliderPrimitive.Root>
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

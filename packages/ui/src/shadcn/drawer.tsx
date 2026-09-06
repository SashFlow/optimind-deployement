"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "../utils";

type DrawerDirection = "top" | "bottom" | "left" | "right";

const DrawerDirectionContext = React.createContext<DrawerDirection>("bottom");

type DrawerRootProps = React.ComponentPropsWithoutRef<
	typeof DrawerPrimitive.Root
> & {
	/** Base UI / newer shadcn alias for vaul `direction`. */
	swipeDirection?: DrawerDirection;
};

const Drawer = ({
	shouldScaleBackground = true,
	swipeDirection,
	direction,
	...props
}: DrawerRootProps) => {
	const resolvedDirection = (swipeDirection ??
		direction ??
		"bottom") as DrawerDirection;

	return (
		<DrawerDirectionContext.Provider value={resolvedDirection}>
			<DrawerPrimitive.Root
				shouldScaleBackground={shouldScaleBackground}
				direction={resolvedDirection}
				{...props}
			/>
		</DrawerDirectionContext.Provider>
	);
};
Drawer.displayName = "Drawer";

type DrawerTriggerProps = React.ComponentPropsWithoutRef<
	typeof DrawerPrimitive.Trigger
> & {
	/** Base UI / newer shadcn composition prop; maps to Radix `asChild`. */
	render?: React.ReactElement;
};

const DrawerTrigger = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Trigger>,
	DrawerTriggerProps
>(({ render, asChild, children, ...props }, ref) => {
	if (render) {
		return (
			<DrawerPrimitive.Trigger ref={ref} asChild {...props}>
				{render}
			</DrawerPrimitive.Trigger>
		);
	}

	return (
		<DrawerPrimitive.Trigger ref={ref} asChild={asChild} {...props}>
			{children}
		</DrawerPrimitive.Trigger>
	);
});
DrawerTrigger.displayName = DrawerPrimitive.Trigger.displayName;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		className={cn("fixed inset-0 z-50 bg-black/80", className)}
		{...props}
	/>
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
	const swipeDirection = React.useContext(DrawerDirectionContext);

	return (
		<DrawerPortal>
			<DrawerOverlay />
			<DrawerPrimitive.Content
				ref={ref}
				data-swipe-direction={swipeDirection}
				className={cn(
					"bg-background fixed z-50 flex h-auto flex-col border",
					"data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:rounded-t-[10px]",
					"data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:rounded-b-[10px]",
					"data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:h-full data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-[10px] sm:data-[vaul-drawer-direction=left]:max-w-sm",
					"data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-[10px] sm:data-[vaul-drawer-direction=right]:max-w-sm",
					"data-[swipe-direction=bottom]:inset-x-0 data-[swipe-direction=bottom]:bottom-0 data-[swipe-direction=bottom]:mt-24 data-[swipe-direction=bottom]:rounded-t-[10px]",
					"data-[swipe-direction=top]:inset-x-0 data-[swipe-direction=top]:top-0 data-[swipe-direction=top]:mb-24 data-[swipe-direction=top]:rounded-b-[10px]",
					"data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:h-full data-[swipe-direction=left]:w-3/4 data-[swipe-direction=left]:rounded-r-[10px] sm:data-[swipe-direction=left]:max-w-sm",
					"data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:h-full data-[swipe-direction=right]:w-3/4 data-[swipe-direction=right]:rounded-l-[10px] sm:data-[swipe-direction=right]:max-w-sm",
					className,
				)}
				{...props}
			>
				{swipeDirection === "bottom" || swipeDirection === "top" ? (
					<div className="bg-muted mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full" />
				) : null}
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	);
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
		{...props}
	/>
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("mt-auto flex flex-col gap-2 p-4", className)}
		{...props}
	/>
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg leading-none font-semibold tracking-tight",
			className,
		)}
		{...props}
	/>
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Description
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
};

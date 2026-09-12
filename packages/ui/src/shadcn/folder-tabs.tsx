"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "../utils";

const FolderTabs = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Root
		ref={ref}
		className={cn(
			"bg-muted text-foreground flex min-h-0 flex-col overflow-hidden rounded-2xl",
			className,
		)}
		{...props}
	/>
));
FolderTabs.displayName = "FolderTabs";

const FolderTabsBar = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"flex shrink-0 items-end gap-2 bg-linear-to-t from-black/15 to-transparent px-2 pt-2 sm:px-3 sm:pt-2.5",
			className,
		)}
		{...props}
	/>
));
FolderTabsBar.displayName = "FolderTabsBar";

const FolderTabsBack = React.forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<"button"> & {
		href?: string;
	}
>(({ className, href, onClick, children, ...props }, ref) => {
	const router = useRouter();

	return (
		<button
			ref={ref}
			type="button"
			aria-label="Back"
			className={cn(
				"text-muted-foreground inline-flex shrink-0 items-center gap-1.5 self-center rounded-lg p-1.5 text-sm font-medium transition-colors",
				"hover:bg-background/60 hover:text-foreground",
				"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
				"disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (href) {
					router.push(href);
				} else {
					router.back();
				}
			}}
			{...props}
		>
			<ArrowLeftIcon className="size-4" />
			{children}
		</button>
	);
});
FolderTabsBack.displayName = "FolderTabsBack";

const FolderTabsList = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn(
			"text-muted-foreground flex min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
			className,
		)}
		{...props}
	/>
));
FolderTabsList.displayName = "FolderTabsList";

const FolderTabsTrigger = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			"relative z-0 inline-flex shrink-0 items-center gap-2 rounded-t-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
			"bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground",
			"focus-visible:ring-ring focus-visible:z-20 focus-visible:ring-2 focus-visible:outline-hidden",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:z-10",
			className,
		)}
		{...props}
	/>
));
FolderTabsTrigger.displayName = "FolderTabsTrigger";

const FolderTabsActions = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"mb-1.5 flex shrink-0 items-center gap-1 self-center sm:gap-1.5",
			"[&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-lg [&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-sm [&_button]:font-medium [&_button]:shadow-xs [&_button]:transition-colors",
			"[&_button]:focus-visible:ring-ring [&_button]:focus-visible:ring-2 [&_button]:focus-visible:outline-hidden",
			className,
		)}
		{...props}
	/>
));
FolderTabsActions.displayName = "FolderTabsActions";

const FolderTabsContent = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
		scrollable?: boolean;
	}
>(({ className, scrollable = false, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			"bg-card flex min-h-0 flex-1 flex-col rounded-b-2xl outline-hidden p-3 md:p-6",
			scrollable
				? "no-scrollbar overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
				: "overflow-hidden",
			"data-[state=inactive]:hidden",
			className,
		)}
		{...props}
	/>
));
FolderTabsContent.displayName = "FolderTabsContent";

export {
	FolderTabs,
	FolderTabsActions,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
};

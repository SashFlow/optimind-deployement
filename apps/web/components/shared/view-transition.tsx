"use client";

import { cn } from "@repo/ui/utils";
import {
	AnimatePresence,
	motion,
	type Transition,
	type Variants,
} from "motion/react";
import {
	useEffect,
	useRef,
	type PropsWithChildren,
	type ReactNode,
} from "react";

const TRANSITION: Transition = {
	duration: 0.55,
	ease: [0.22, 1, 0.36, 1],
};

const verticalVariants: Variants = {
	enter: {
		y: "28%",
		opacity: 0,
	},
	center: {
		y: 0,
		opacity: 1,
	},
	exit: {
		y: "18%",
		opacity: 0,
	},
};

const horizontalVariants: Variants = {
	enter: (direction: number) => ({
		x: direction > 0 ? "18%" : "-18%",
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? "-12%" : "12%",
		opacity: 0,
	}),
};

type ViewTransitionProps = PropsWithChildren<{
	transitionKey: string;
	axis: "x" | "y";
	direction?: 1 | -1;
	className?: string;
}>;

export function ViewTransition({
	transitionKey,
	axis,
	direction = 1,
	className,
	children,
}: ViewTransitionProps) {
	return (
		<div
			className={cn(
				"relative min-h-0 w-full flex-1 overflow-hidden",
				className,
			)}
		>
			<AnimatePresence mode="sync" initial={false} custom={direction}>
				<motion.div
					key={transitionKey}
					custom={direction}
					variants={
						axis === "y" ? verticalVariants : horizontalVariants
					}
					initial="enter"
					animate="center"
					exit="exit"
					transition={TRANSITION}
					style={{ willChange: "transform, opacity" }}
					className="absolute inset-0 flex min-h-0 flex-col overflow-hidden"
				>
					{children}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

/**
 * Collapses tabbed workspace routes so AppShell vertical transitions
 * only fire when leaving a section, not when switching tabs.
 */
export function getAppSectionKey(pathname: string): string {
	const parts = pathname.split("/").filter(Boolean);
	// Expect: app / <section> / ...
	if (parts[0] !== "app" || !parts[1]) {
		return pathname || "root";
	}

	const section = parts[1];

	if (section === "agents" && parts[2]) {
		return `agents:${parts[2]}`;
	}
	if (section === "campaigns" && parts[2]) {
		return `campaigns:${parts[2]}`;
	}
	if (section === "settings") {
		return "settings";
	}

	return section;
}

/**
 * Tracks previous tab index to derive slide direction (1 = forward / right, -1 = back / left).
 */
export function useTabDirection(
	orderedValues: readonly string[],
	activeValue: string,
): 1 | -1 {
	const prevValueRef = useRef(activeValue);
	const prevValue = prevValueRef.current;
	const currentIndex = orderedValues.indexOf(activeValue);
	const prevIndex = orderedValues.indexOf(prevValue);

	let direction: 1 | -1 = 1;
	if (currentIndex !== -1 && prevIndex !== -1 && currentIndex !== prevIndex) {
		direction = currentIndex > prevIndex ? 1 : -1;
	}

	useEffect(() => {
		prevValueRef.current = activeValue;
	}, [activeValue]);

	return direction;
}

export function TabViewTransition({
	activeValue,
	orderedValues,
	children,
	className,
}: {
	activeValue: string;
	orderedValues: readonly string[];
	children: ReactNode;
	className?: string;
}) {
	const direction = useTabDirection(orderedValues, activeValue);

	return (
		<ViewTransition
			transitionKey={activeValue}
			axis="x"
			direction={direction}
			className={className}
		>
			{children}
		</ViewTransition>
	);
}

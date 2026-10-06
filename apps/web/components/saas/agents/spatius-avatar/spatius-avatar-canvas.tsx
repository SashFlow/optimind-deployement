"use client";

import { cn } from "@repo/ui/utils";
import {
	type CSSProperties,
	type HTMLAttributes,
	type MutableRefObject,
	type Ref,
	useCallback,
} from "react";
import { useSpatiusAvatarContext } from "@/components/saas/agents/spatius-avatar/spatius-avatar-context";

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
	if (typeof ref === "function") {
		ref(value);
		return;
	}

	if (ref) {
		(ref as MutableRefObject<T | null>).current = value;
	}
}

export interface SpatiusAvatarCanvasProps
	extends HTMLAttributes<HTMLDivElement> {
	minHeight?: CSSProperties["minHeight"];
}

export function SpatiusAvatarCanvas({
	className,
	minHeight = 420,
	ref,
	style,
	...props
}: SpatiusAvatarCanvasProps & { ref?: Ref<HTMLDivElement> }) {
	const { containerRef } = useSpatiusAvatarContext();

	// Must stay referentially stable: React detaches and reattaches a ref whose
	// identity changed, and a detach tears the avatar player down and rebuilds
	// it. An inline callback here means every parent re-render restarts Spatius.
	const setNode = useCallback(
		(node: HTMLDivElement | null) => {
			containerRef(node);
			assignRef(ref, node);
		},
		[containerRef, ref],
	);

	return (
		<div
			{...props}
			ref={setNode}
			className={cn(
				"relative z-0 w-full overflow-hidden bg-white",
				className,
			)}
			style={{ minHeight, ...style }}
		/>
	);
}

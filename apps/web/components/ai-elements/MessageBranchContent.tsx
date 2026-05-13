"use client";

import { cn } from "@repo/ui/utils";
import { useEffect } from "react";
import { type MessageBranchContentProps, useMessageBranch } from "./message";

export const MessageBranchContent = ({
	children,
	...props
}: MessageBranchContentProps) => {
	const { currentBranch, setBranches, branches } = useMessageBranch();
	const childrenArray = Array.isArray(children) ? children : [children];

	// Use useEffect to update branches when they change
	useEffect(() => {
		if (branches.length !== childrenArray.length) {
			setBranches(childrenArray);
		}
	}, [childrenArray, branches, setBranches]);

	return childrenArray.map((branch, index) => (
		<div
			className={cn(
				"grid gap-2 overflow-hidden [&>div]:pb-0",
				index === currentBranch ? "block" : "hidden",
			)}
			key={branch.key}
			{...props}
		>
			{branch}
		</div>
	));
};

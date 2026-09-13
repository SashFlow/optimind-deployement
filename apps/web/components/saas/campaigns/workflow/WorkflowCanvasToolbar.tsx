"use client";

import { cn } from "@repo/ui/utils";
import { Download, Hand, LayoutGrid, MousePointer2, Plus } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type CanvasInteractionMode = "pointer" | "hand";

type Props = {
	mode: CanvasInteractionMode;
	onModeChange: (mode: CanvasInteractionMode) => void;
	onAddNode: () => void;
	onOrganize: () => void;
	onExport: () => void;
	addNodeOpen?: boolean;
};

export const WorkflowCanvasToolbar = forwardRef<HTMLDivElement, Props>(
	function WorkflowCanvasToolbar(
		{ mode, onModeChange, onAddNode, onOrganize, onExport, addNodeOpen },
		ref,
	) {
		return (
			<div
				ref={ref}
				className="workflow-canvas-toolbar absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-row gap-0.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-md"
			>
				<ToolbarButton
					label="Add node"
					active={addNodeOpen}
					onClick={onAddNode}
					data-workflow-add-trigger=""
				>
					<Plus className="size-4" />
				</ToolbarButton>
				<div className="mx-1 my-auto h-6 w-px bg-border" />
				<ToolbarButton
					label="Pointer mode"
					active={mode === "pointer"}
					onClick={() => onModeChange("pointer")}
				>
					<MousePointer2 className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Drag mode"
					active={mode === "hand"}
					onClick={() => onModeChange("hand")}
				>
					<Hand className="size-4" />
				</ToolbarButton>
				<div className="mx-1 my-auto h-6 w-px bg-border" />
				<ToolbarButton label="Organize nodes" onClick={onOrganize}>
					<LayoutGrid className="size-4" />
				</ToolbarButton>
				<ToolbarButton label="Export" onClick={onExport}>
					<Download className="size-4" />
				</ToolbarButton>
			</div>
		);
	},
);

function ToolbarButton({
	children,
	label,
	active,
	onClick,
	...props
}: {
	children: ReactNode;
	label: string;
	active?: boolean;
	onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
				active &&
					"bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
			)}
			{...props}
		>
			{children}
		</button>
	);
}

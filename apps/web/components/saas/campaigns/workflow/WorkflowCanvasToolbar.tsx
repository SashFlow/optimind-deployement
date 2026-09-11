"use client";

import { cn } from "@repo/ui/utils";
import { Download, Hand, LayoutGrid, MousePointer2, Plus } from "lucide-react";
import type { ReactNode } from "react";

export type CanvasInteractionMode = "pointer" | "hand";

type Props = {
	mode: CanvasInteractionMode;
	onModeChange: (mode: CanvasInteractionMode) => void;
	onAddNode: () => void;
	onOrganize: () => void;
	onExport: () => void;
	addNodeOpen?: boolean;
};

export function WorkflowCanvasToolbar({
	mode,
	onModeChange,
	onAddNode,
	onOrganize,
	onExport,
	addNodeOpen,
}: Props) {
	return (
		<div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-row gap-0.5 rounded-xl border border-border/80 bg-white p-1.5 shadow-md">
			<ToolbarButton
				label="Add node"
				active={addNodeOpen}
				onClick={onAddNode}
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
}

function ToolbarButton({
	children,
	label,
	active,
	onClick,
}: {
	children: ReactNode;
	label: string;
	active?: boolean;
	onClick: () => void;
}) {
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
					"bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700",
			)}
		>
			{children}
		</button>
	);
}

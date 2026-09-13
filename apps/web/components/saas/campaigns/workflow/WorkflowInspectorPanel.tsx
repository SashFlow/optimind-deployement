"use client";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { GripVertical, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkflowNodeData } from "./WorkflowFlowNode";
import { WorkflowInspector } from "./WorkflowInspector";

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 416;

type Props = {
	open: boolean;
	title: string;
	description?: string | null;
	selected: { id: string; data: WorkflowNodeData } | null;
	onChange: (data: WorkflowNodeData) => void;
	onClose: () => void;
};

export function WorkflowInspectorPanel({
	open,
	title,
	description,
	selected,
	onChange,
	onClose,
}: Props) {
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const draggingRef = useRef(false);
	const startXRef = useRef(0);
	const startWidthRef = useRef(DEFAULT_WIDTH);

	const onResizeStart = useCallback(
		(e: React.MouseEvent | React.PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();
			draggingRef.current = true;
			startXRef.current = e.clientX;
			startWidthRef.current = width;
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[width],
	);

	useEffect(() => {
		function onMove(e: MouseEvent) {
			if (!draggingRef.current) {
				return;
			}
			// Right-anchored: drag left expands, drag right shrinks
			const next =
				startWidthRef.current + (startXRef.current - e.clientX);
			setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
		}
		function onUp() {
			if (!draggingRef.current) {
				return;
			}
			draggingRef.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open || !selected) {
		return null;
	}

	return (
		<aside
			className="absolute bottom-3 right-3 top-14 z-30 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
			style={{ width }}
			aria-label="Node configuration"
		>
			{/* Left pull bar — drag to resize horizontally */}
			<button
				type="button"
				aria-label="Resize inspector"
				onMouseDown={onResizeStart}
				className={cn(
					"absolute inset-y-0 left-0 z-10 flex w-3 cursor-col-resize items-center justify-center",
					"border-r border-transparent hover:border-border hover:bg-muted/40",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				)}
			>
				<span className="pointer-events-none flex h-10 w-1.5 items-center justify-center rounded-full bg-muted-foreground/25">
					<GripVertical className="size-3 text-muted-foreground" />
				</span>
			</button>

			<header className="flex shrink-0 items-start justify-between gap-2 border-b border-border py-3 pl-5 pr-3">
				<div className="min-w-0">
					<h2 className="truncate text-sm font-semibold text-foreground">
						{title}
					</h2>
					{description ? (
						<p className="truncate text-xs text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					aria-label="Close inspector"
					onClick={onClose}
				>
					<XIcon className="size-3.5" />
				</Button>
			</header>

			<div className="min-h-0 flex-1 overflow-hidden pl-1">
				<WorkflowInspector selected={selected} onChange={onChange} />
			</div>
		</aside>
	);
}

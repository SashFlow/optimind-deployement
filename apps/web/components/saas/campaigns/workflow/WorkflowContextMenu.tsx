"use client";

import { cn } from "@repo/ui/utils";
import { useEffect, useRef } from "react";

type Props = {
	open: boolean;
	position: { x: number; y: number } | null;
	onClose: () => void;
	onAddNode: () => void;
	onTestRun: () => void;
	onExport: () => void;
};

export function WorkflowContextMenu({
	open,
	position,
	onClose,
	onAddNode,
	onTestRun,
	onExport,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		function onPointer(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onClose();
			}
		}
		window.addEventListener("keydown", onKey);
		window.addEventListener("mousedown", onPointer);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("mousedown", onPointer);
		};
	}, [open, onClose]);

	if (!open || !position) return null;

	const left = Math.min(position.x, window.innerWidth - 220);
	const top = Math.min(position.y, window.innerHeight - 200);

	return (
		<div
			ref={ref}
			className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-white py-1 shadow-xl"
			style={{ left, top }}
		>
			<MenuItem
				label="Add Node"
				onClick={() => {
					onAddNode();
					onClose();
				}}
			/>
			<MenuItem
				label="Test Run"
				shortcut="Alt R"
				onClick={() => {
					onTestRun();
					onClose();
				}}
			/>
			<div className="my-1 h-px bg-border" />
			<MenuItem
				label="Export"
				onClick={() => {
					onExport();
					onClose();
				}}
			/>
		</div>
	);
}

function MenuItem({
	label,
	shortcut,
	disabled,
	onClick,
}: {
	label: string;
	shortcut?: string;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-sm text-foreground hover:bg-muted",
				disabled && "pointer-events-none text-muted-foreground/50",
			)}
		>
			<span>{label}</span>
			{shortcut && (
				<span className="font-mono text-[11px] text-muted-foreground">
					{shortcut}
				</span>
			)}
		</button>
	);
}

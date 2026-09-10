"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@repo/ui/utils";

const CATEGORY_COLORS: Record<string, string> = {
	"start.webhook": "border-emerald-500/60 bg-emerald-500/10",
	"start.scheduled": "border-emerald-500/60 bg-emerald-500/10",
	"control.if": "border-amber-500/60 bg-amber-500/10",
	"control.loop": "border-amber-500/60 bg-amber-500/10",
	"http.request": "border-sky-500/60 bg-sky-500/10",
	"code.js": "border-sky-500/60 bg-sky-500/10",
	"human.approval": "border-violet-500/60 bg-violet-500/10",
	"knowledge.retrieve": "border-sky-500/60 bg-sky-500/10",
	"ai.agent": "border-fuchsia-500/60 bg-fuchsia-500/10",
	"ai.llm": "border-fuchsia-500/60 bg-fuchsia-500/10",
	"storage.s3": "border-orange-500/60 bg-orange-500/10",
	"storage.azure": "border-orange-500/60 bg-orange-500/10",
	"storage.gcp": "border-orange-500/60 bg-orange-500/10",
	end: "border-rose-500/60 bg-rose-500/10",
};

export type WorkflowNodeData = {
	label?: string;
	type: string;
	config: Record<string, unknown>;
};

export function WorkflowFlowNode({ data, selected }: NodeProps) {
	const nodeData = data as WorkflowNodeData;
	const type = nodeData.type;
	const isIf = type === "control.if";
	const isLoop = type === "control.loop";
	const isStart = type.startsWith("start.");
	const isEnd = type === "end";

	return (
		<div
			className={cn(
				"min-w-[160px] rounded-xl border px-3 py-2 shadow-sm backdrop-blur-sm",
				CATEGORY_COLORS[type] ?? "border-border bg-card",
				selected && "ring-2 ring-primary",
			)}
		>
			{!isStart && (
				<Handle
					type="target"
					position={Position.Left}
					className="!size-2.5 !border-background !bg-foreground"
				/>
			)}
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{type}
			</div>
			<div className="text-sm font-semibold text-foreground">
				{nodeData.label ?? type}
			</div>
			{!isEnd && !isIf && !isLoop && (
				<Handle
					type="source"
					position={Position.Right}
					className="!size-2.5 !border-background !bg-foreground"
				/>
			)}
			{isIf && (
				<>
					<Handle
						type="source"
						id="true"
						position={Position.Right}
						style={{ top: "30%" }}
						className="!size-2.5 !border-background !bg-emerald-500"
					/>
					<Handle
						type="source"
						id="else"
						position={Position.Right}
						style={{ top: "70%" }}
						className="!size-2.5 !border-background !bg-rose-500"
					/>
				</>
			)}
			{isLoop && (
				<>
					<Handle
						type="source"
						id="body"
						position={Position.Right}
						style={{ top: "30%" }}
						className="!size-2.5 !border-background !bg-sky-500"
					/>
					<Handle
						type="source"
						id="exit"
						position={Position.Right}
						style={{ top: "70%" }}
						className="!size-2.5 !border-background !bg-muted-foreground"
					/>
				</>
			)}
		</div>
	);
}

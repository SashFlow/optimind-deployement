"use client";

import { cn } from "@repo/ui/utils";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getCatalogItem } from "./catalog";

export type WorkflowNodeData = {
	label?: string;
	type: string;
	config: Record<string, unknown>;
};

function previewFor(type: string, config: Record<string, unknown>): string | null {
	switch (type) {
		case "start.webhook":
			return "HTTP trigger";
		case "start.scheduled":
			return `Cron: ${String(config.cron ?? "—")}`;
		case "http.request":
			return `${String(config.method ?? "GET")} ${String(config.url || "—").slice(0, 40)}`;
		case "code.js":
			return String(config.code ?? "")
				.split("\n")[0]
				?.slice(0, 48) || "JS";
		case "human.approval":
			return `Channel: ${String(config.channel ?? "WEB")}`;
		case "knowledge.retrieve":
			return String(config.query || "Query…").slice(0, 40);
		case "ai.agent":
			return `${String(config.modality ?? "voice")} · ${String(config.channel ?? "WEB")}`;
		case "ai.llm":
			return String(config.model ?? "gpt-4o-mini");
		case "control.if": {
			const cases = Array.isArray(config.cases)
				? (config.cases as Array<{ expression?: string }>)
				: [];
			return cases[0]?.expression || "Condition…";
		}
		case "control.loop":
			return String(config.itemsPath || config.mode || "forEach");
		case "storage.s3":
		case "storage.azure":
		case "storage.gcp":
			return `${String(config.operation ?? "read")} · ${String(config.key || config.bucket || "…")}`;
		case "end":
			return "Finish run";
		default:
			return null;
	}
}

export function WorkflowFlowNode({ data, selected }: NodeProps) {
	const nodeData = data as WorkflowNodeData;
	const type = nodeData.type;
	const catalog = getCatalogItem(type);
	const Icon = catalog?.icon;
	const isIf = type === "control.if";
	const isLoop = type === "control.loop";
	const isStart = type.startsWith("start.");
	const isEnd = type === "end";
	const preview = previewFor(type, nodeData.config ?? {});

	return (
		<div
			className={cn(
				"min-w-[200px] max-w-[280px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
				selected &&
					"border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.15)]",
			)}
		>
			{!isStart && (
				<Handle
					type="target"
					position={Position.Left}
					className="!-left-1.5 !size-2.5 !border-2 !border-white !bg-blue-500"
				/>
			)}

			<div className="flex items-center gap-2 px-3 py-2.5">
				<span
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-md text-white",
						catalog?.iconBg ?? "bg-slate-500",
					)}
				>
					{Icon ? <Icon className="size-3.5" /> : null}
				</span>
				<div className="min-w-0 flex-1">
					<div className="truncate text-[13px] font-semibold text-[#111827]">
						{nodeData.label ?? catalog?.label ?? type}
					</div>
				</div>
			</div>

			{preview && (
				<div className="border-t border-[#F3F4F6] px-3 py-2">
					<div className="truncate font-mono text-[11px] text-[#6B7280]">
						{preview}
					</div>
				</div>
			)}

			{!isEnd && !isIf && !isLoop && (
				<Handle
					type="source"
					position={Position.Right}
					className="!-right-1.5 !size-2.5 !border-2 !border-white !bg-blue-500"
				/>
			)}
			{isIf && (
				<>
					<Handle
						type="source"
						id="true"
						position={Position.Right}
						style={{ top: "35%" }}
						className="!-right-1.5 !size-2.5 !border-2 !border-white !bg-emerald-500"
					/>
					<Handle
						type="source"
						id="else"
						position={Position.Right}
						style={{ top: "70%" }}
						className="!-right-1.5 !size-2.5 !border-2 !border-white !bg-rose-500"
					/>
				</>
			)}
			{isLoop && (
				<>
					<Handle
						type="source"
						id="body"
						position={Position.Right}
						style={{ top: "35%" }}
						className="!-right-1.5 !size-2.5 !border-2 !border-white !bg-sky-500"
					/>
					<Handle
						type="source"
						id="exit"
						position={Position.Right}
						style={{ top: "70%" }}
						className="!-right-1.5 !size-2.5 !border-2 !border-white !bg-slate-400"
					/>
				</>
			)}
		</div>
	);
}

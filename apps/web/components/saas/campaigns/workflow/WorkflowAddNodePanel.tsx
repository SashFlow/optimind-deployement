"use client";

import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/utils";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterCatalog, type CatalogItem, type CatalogTab } from "./catalog";

const TABS: CatalogTab[] = ["Nodes", "Start", "AI", "Tools"];

type Props = {
	open: boolean;
	anchor: { x: number; y: number } | null;
	onClose: () => void;
	onSelect: (item: CatalogItem) => void;
};

export function WorkflowAddNodePanel({
	open,
	anchor,
	onClose,
	onSelect,
}: Props) {
	const [tab, setTab] = useState<CatalogTab>("Nodes");
	const [query, setQuery] = useState("");
	const panelRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const groups = useMemo(() => filterCatalog(tab, query), [tab, query]);

	useEffect(() => {
		if (!open) return;
		setQuery("");
		setTab("Nodes");
		const t = window.setTimeout(() => inputRef.current?.focus(), 50);
		return () => window.clearTimeout(t);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		function onPointer(e: MouseEvent) {
			if (
				panelRef.current &&
				!panelRef.current.contains(e.target as Node)
			) {
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

	if (!open || !anchor) return null;

	const left = Math.min(anchor.x, window.innerWidth - 320);
	const top = Math.min(anchor.y, window.innerHeight - 420);

	return (
		<div
			ref={panelRef}
			className="fixed z-50 flex max-h-[70vh] w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl"
			style={{ left, top }}
		>
			<div className="flex border-b border-border px-1">
				{TABS.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={cn(
							"flex-1 px-2 py-2.5 text-sm font-medium transition-colors",
							tab === t
								? "border-b-2 border-blue-600 text-blue-600"
								: "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{t}
					</button>
				))}
			</div>

			<div className="relative px-3 py-2">
				<Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					ref={inputRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search nodes, agent, human, Knowledge"
					className="h-9 pl-8 text-sm"
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
				{groups.length === 0 && (
					<p className="px-2 py-4 text-center text-xs text-muted-foreground">
						No matching nodes
					</p>
				)}
				{groups.map((group) => (
					<div key={group.category} className="mb-3">
						<div className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
							{group.category}
						</div>
						<ul className="space-y-0.5">
							{group.items.map((item) => {
								const Icon = item.icon;
								return (
									<li key={item.type}>
										<button
											type="button"
											className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/70"
											onClick={() => {
												onSelect(item);
												onClose();
											}}
										>
											<span
												className={cn(
													"flex size-6 shrink-0 items-center justify-center rounded-md text-white",
													item.iconBg,
												)}
											>
												<Icon className="size-3.5" />
											</span>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium text-foreground">
													{item.label}
												</span>
												<span className="block truncate text-[11px] text-muted-foreground">
													{item.description}
												</span>
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}

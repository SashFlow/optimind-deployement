"use client";

import { Button } from "@repo/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@repo/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { cn } from "@repo/ui/utils";
import { ChevronsUpDownIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

export type KnowledgeBaseSource = {
	id: string;
	label: string;
};

type KnowledgeBaseSelectProps = {
	selectedIds: string[];
	sources: KnowledgeBaseSource[];
	onChange: (ids: string[]) => void;
};

export function KnowledgeBaseSelect({
	selectedIds,
	sources,
	onChange,
}: KnowledgeBaseSelectProps) {
	const [open, setOpen] = useState(false);
	const sourceMap = new Map(
		sources.map((source) => [source.id, source.label]),
	);
	const selectedSources = selectedIds.map((id) => ({
		id,
		label: sourceMap.get(id) ?? id,
		orphaned: !sourceMap.has(id),
	}));
	const availableSources = sources.filter(
		(source) => !selectedIds.includes(source.id),
	);

	function addSource(id: string) {
		if (selectedIds.includes(id)) {
			return;
		}
		onChange([...selectedIds, id]);
	}

	function removeSource(id: string) {
		onChange(selectedIds.filter((selectedId) => selectedId !== id));
	}

	if (sources.length === 0 && selectedIds.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No knowledge sources available yet. Add sources in Knowledge
				Base.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={availableSources.length === 0}
						className="w-full justify-between bg-background font-normal"
					>
						<span className="truncate text-muted-foreground">
							{availableSources.length === 0
								? selectedIds.length > 0
									? "All knowledge bases selected"
									: "No knowledge bases available"
								: "Select knowledge bases"}
						</span>
						<ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) p-0"
					align="start"
				>
					<Command>
						<CommandInput placeholder="Search knowledge bases..." />
						<CommandList>
							<CommandEmpty>No matches found.</CommandEmpty>
							<CommandGroup>
								{availableSources.map((source) => (
									<CommandItem
										key={source.id}
										value={`${source.label} ${source.id}`}
										onSelect={() => {
											addSource(source.id);
										}}
									>
										{source.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{selectedSources.length > 0 ? (
				<ul className="divide-y overflow-hidden rounded-lg border bg-background">
					{selectedSources.map((source) => (
						<li
							key={source.id}
							className="flex items-center gap-3 px-3 py-2.5"
						>
							<span
								className={cn(
									"min-w-0 flex-1 truncate text-sm",
									source.orphaned && "text-muted-foreground",
								)}
								title={source.orphaned ? source.id : undefined}
							>
								{source.label}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => removeSource(source.id)}
								aria-label={`Remove ${source.label}`}
								className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
							>
								<Trash2Icon className="size-4" />
							</Button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

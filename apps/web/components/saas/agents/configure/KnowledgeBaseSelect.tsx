"use client";

import { Checkbox } from "@repo/ui/checkbox";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/utils";

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
	const sourceMap = new Map(sources.map((source) => [source.id, source.label]));
	const orphanedIds = selectedIds.filter((id) => !sourceMap.has(id));

	function toggleSource(id: string, checked: boolean) {
		if (checked) {
			onChange([...new Set([...selectedIds, id])]);
			return;
		}
		onChange(selectedIds.filter((selectedId) => selectedId !== id));
	}

	function removeOrphanedId(id: string) {
		onChange(selectedIds.filter((selectedId) => selectedId !== id));
	}

	if (sources.length === 0) {
		return (
			<div className="space-y-3">
				<p className="text-sm text-muted-foreground">
					No knowledge sources available yet. Add sources in Knowledge Base.
				</p>
				{orphanedIds.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{orphanedIds.map((id) => (
							<span
								key={id}
								className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
							>
								{id}
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground"
									onClick={() => removeOrphanedId(id)}
									aria-label={`Remove ${id}`}
								>
									×
								</button>
							</span>
						))}
					</div>
				) : null}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				{sources.map((source) => {
					const checked = selectedIds.includes(source.id);
					return (
						<label
							key={source.id}
							className={cn(
								"flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
								checked ? "border-foreground/20 bg-background" : "border-transparent bg-background/60",
							)}
						>
							<Checkbox
								checked={checked}
								onCheckedChange={(value) => toggleSource(source.id, value === true)}
							/>
							<span className="text-sm">{source.label}</span>
						</label>
					);
				})}
			</div>
			{orphanedIds.length > 0 ? (
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Unavailable sources</Label>
					<div className="flex flex-wrap gap-2">
						{orphanedIds.map((id) => (
							<span
								key={id}
								className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
							>
								{id}
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground"
									onClick={() => removeOrphanedId(id)}
									aria-label={`Remove ${id}`}
								>
									×
								</button>
							</span>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}

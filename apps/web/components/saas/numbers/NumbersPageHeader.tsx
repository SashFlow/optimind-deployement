"use client";

type NumbersPageHeaderProps = {
	numberCount: number;
	trunkCount: number;
	ruleCount: number;
};

export function NumbersPageHeader({
	numberCount,
	trunkCount,
	ruleCount,
}: NumbersPageHeaderProps) {
	return (
		<div className="flex flex-wrap gap-2">
			<span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
				{numberCount} number{numberCount === 1 ? "" : "s"}
			</span>
			<span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
				{trunkCount} trunk{trunkCount === 1 ? "" : "s"}
			</span>
			<span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
				{ruleCount} routing rule{ruleCount === 1 ? "" : "s"}
			</span>
		</div>
	);
}

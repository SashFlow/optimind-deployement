"use client";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@repo/ui/command";
import { cn } from "@repo/ui/utils";
import { KeyRoundIcon, VariableIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { VariableTokenBadge } from "@/components/saas/agents/configure/VariableTokenBadge";
import type { AgentVariableDefinition } from "@/lib/agent-config";

export type TemplateToken = {
	name: string;
	kind: "variable" | "secret";
	variable_type?: AgentVariableDefinition["variable_type"];
	required?: boolean;
};

export function buildTemplateTokens(
	variables: AgentVariableDefinition[],
	environmentVariables: Record<string, string>,
): TemplateToken[] {
	const variableTokens = variables
		.filter((v) => v.name.trim())
		.map((v) => ({
			name: v.name,
			kind: "variable" as const,
			variable_type: v.variable_type,
			required: v.required,
		}));
	const secretTokens = Object.keys(environmentVariables)
		.filter(Boolean)
		.map((name) => ({ name, kind: "secret" as const }));
	return [...variableTokens, ...secretTokens];
}

type MenuPosition = {
	top: number;
	left: number;
	placement: "below" | "above";
};

type TemplateTokenMenuProps = {
	open: boolean;
	tokens: TemplateToken[];
	filter: string;
	onFilterChange: (value: string) => void;
	onSelect: (token: TemplateToken) => void;
	onClose?: () => void;
	position?: MenuPosition | null;
	className?: string;
};

const MENU_WIDTH = 260;
const MENU_MAX_HEIGHT = 240;

function TokenRow({ token }: { token: TemplateToken }) {
	return (
		<div className="flex min-w-0 flex-1 items-center gap-2">
			<VariableTokenBadge name={token.name} kind={token.kind} />
			{token.kind === "variable" && token.variable_type ? (
				<span className="text-[11px] text-muted-foreground">
					{token.variable_type}
				</span>
			) : null}
			{token.kind === "variable" && token.required ? (
				<span
					className="size-1.5 shrink-0 rounded-full bg-destructive"
					title="Required"
				/>
			) : null}
			{token.kind === "secret" ? (
				<KeyRoundIcon className="ml-auto size-3 shrink-0 text-muted-foreground" />
			) : (
				<VariableIcon className="ml-auto size-3 shrink-0 text-muted-foreground" />
			)}
		</div>
	);
}

export function TemplateTokenMenu({
	open,
	tokens,
	filter,
	onFilterChange,
	onSelect,
	onClose,
	position,
	className,
}: TemplateTokenMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [adjustedPosition, setAdjustedPosition] =
		useState<MenuPosition | null>(null);

	useEffect(() => {
		if (!open || !position || !menuRef.current) {
			setAdjustedPosition(position ?? null);
			return;
		}

		const rect = menuRef.current.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const viewportWidth = window.innerWidth;
		let top = position.top;
		let left = position.left;
		let placement = position.placement;

		if (placement === "below" && top + rect.height > viewportHeight - 8) {
			placement = "above";
			top = position.top - rect.height - 8;
		}

		if (left + MENU_WIDTH > viewportWidth - 8) {
			left = Math.max(8, viewportWidth - MENU_WIDTH - 8);
		}

		setAdjustedPosition({ top, left, placement });
	}, [open, position, tokens.length, filter]);

	if (!open) return null;

	const normalizedFilter = filter.toLowerCase();
	const filtered = tokens.filter((token) =>
		token.name.toLowerCase().includes(normalizedFilter),
	);
	const hasTokens = tokens.length > 0;
	const resolvedPosition = adjustedPosition ?? position;

	const menu = (
		<div
			ref={menuRef}
			style={
				resolvedPosition
					? {
							position: "fixed",
							top: resolvedPosition.top,
							left: resolvedPosition.left,
							width: MENU_WIDTH,
							zIndex: 9999,
						}
					: undefined
			}
			className={cn(
				"overflow-hidden rounded-lg border bg-popover shadow-lg",
				!resolvedPosition && "absolute bottom-2 left-2 z-50",
				className,
			)}
			onMouseDown={(event) => event.preventDefault()}
		>
			{hasTokens ? (
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search variables..."
						value={filter}
						onValueChange={onFilterChange}
						className="h-9"
					/>
					<CommandList style={{ maxHeight: MENU_MAX_HEIGHT }}>
						<CommandEmpty>No matching variables.</CommandEmpty>
						{filtered.some((t) => t.kind === "variable") ? (
							<CommandGroup heading="Variables">
								{filtered
									.filter((t) => t.kind === "variable")
									.map((token) => (
										<CommandItem
											key={`var-${token.name}`}
											value={token.name}
											onSelect={() => onSelect(token)}
											className="py-2"
										>
											<TokenRow token={token} />
										</CommandItem>
									))}
							</CommandGroup>
						) : null}
						{filtered.some((t) => t.kind === "secret") ? (
							<CommandGroup heading="Secrets">
								{filtered
									.filter((t) => t.kind === "secret")
									.map((token) => (
										<CommandItem
											key={`secret-${token.name}`}
											value={token.name}
											onSelect={() => onSelect(token)}
											className="py-2"
										>
											<TokenRow token={token} />
										</CommandItem>
									))}
							</CommandGroup>
						) : null}
					</CommandList>
					<div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
						↑↓ navigate · Enter select · Esc close
					</div>
				</Command>
			) : (
				<div className="space-y-1 px-3 py-3">
					<p className="text-sm font-medium">No variables defined</p>
					<p className="text-xs text-muted-foreground">
						Add session variables under Advanced → Variables, then
						reference them here with{" "}
						<span className="font-mono">/</span> or the insert
						button.
					</p>
					{onClose ? (
						<button
							type="button"
							className="mt-2 text-xs text-primary hover:underline"
							onClick={onClose}
						>
							Dismiss
						</button>
					) : null}
				</div>
			)}
		</div>
	);

	if (resolvedPosition) {
		return createPortal(menu, document.body);
	}

	return menu;
}

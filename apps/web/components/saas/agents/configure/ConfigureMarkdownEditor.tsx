"use client";

import { markdown } from "@codemirror/lang-markdown";
import { EditorView, keymap } from "@codemirror/view";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { BracesIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	buildTemplateTokens,
	type TemplateToken,
	TemplateTokenMenu,
} from "@/components/saas/agents/configure/TemplateTokenMenu";
import {
	variableTokenHighlight,
	variableTokenTheme,
} from "@/components/saas/agents/configure/variableTokenHighlight";
import type { AgentVariableDefinition } from "@/lib/agent-config";

const LINE_HEIGHT_PX = 22;
const EDITOR_PADDING_PX = 24;
const MAX_EDITOR_HEIGHT_PX = 320;

type MenuPosition = {
	top: number;
	left: number;
	placement: "below" | "above";
};

type ConfigureMarkdownEditorProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	minHeight?: string;
	variables?: AgentVariableDefinition[];
	environmentVariables?: Record<string, string>;
};

function parseHeightPx(value: string): number {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : 120;
}

function computeEditorHeight(value: string, minHeightPx: number): number {
	const lineCount = Math.max(1, value.split("\n").length);
	const contentHeight = lineCount * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
	return Math.min(Math.max(contentHeight, minHeightPx), MAX_EDITOR_HEIGHT_PX);
}

function canOpenSlashMenu(view: EditorView): boolean {
	const head = view.state.selection.main.head;
	const line = view.state.doc.lineAt(head);
	const before = view.state.doc.sliceString(line.from, head);
	return before.length === 0 || /\s$/.test(before);
}

function getMenuPosition(view: EditorView, head: number): MenuPosition | null {
	const coords = view.coordsAtPos(head);
	if (!coords) return null;
	return {
		top: coords.bottom + 4,
		left: coords.left,
		placement: "below",
	};
}

export function ConfigureMarkdownEditor({
	value,
	onChange,
	placeholder,
	className,
	minHeight = "120px",
	variables = [],
	environmentVariables = {},
}: ConfigureMarkdownEditorProps) {
	const editorRef = useRef<ReactCodeMirrorRef>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuFilter, setMenuFilter] = useState("");
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const [showEmptyMenu, setShowEmptyMenu] = useState(false);
	const [slashStart, setSlashStart] = useState<number | null>(null);

	const minHeightPx = parseHeightPx(minHeight);
	const editorHeightPx = computeEditorHeight(value, minHeightPx);
	const isAtMaxHeight = editorHeightPx >= MAX_EDITOR_HEIGHT_PX;

	const tokens = useMemo(
		() => buildTemplateTokens(variables, environmentVariables),
		[variables, environmentVariables],
	);

	const secretNames = useMemo(
		() => new Set(Object.keys(environmentVariables).filter(Boolean)),
		[environmentVariables],
	);

	const closeMenu = useCallback(() => {
		setMenuOpen(false);
		setShowEmptyMenu(false);
		setMenuFilter("");
		setMenuPosition(null);
		setSlashStart(null);
	}, []);

	const openMenuAtCursor = useCallback(
		(view: EditorView, fromSlash = false) => {
			const head = view.state.selection.main.head;
			if (fromSlash) {
				if (tokens.length === 0) return;
				if (!canOpenSlashMenu(view)) return;
			}

			setSlashStart(head);
			setMenuPosition(getMenuPosition(view, head));
			setMenuFilter("");
			if (tokens.length === 0) {
				setShowEmptyMenu(true);
				setMenuOpen(false);
			} else {
				setShowEmptyMenu(false);
				setMenuOpen(true);
			}
		},
		[tokens.length],
	);

	const updateMenuFilter = useCallback(
		(view: EditorView) => {
			if (slashStart === null) return;
			const head = view.state.selection.main.head;
			const from = slashStart;
			if (head < from) {
				closeMenu();
				return;
			}
			const typed = view.state.doc.sliceString(from, head);
			if (!typed.startsWith("/")) {
				closeMenu();
				return;
			}
			setMenuFilter(typed.slice(1));
		},
		[closeMenu, slashStart],
	);

	const insertToken = useCallback(
		(token: TemplateToken) => {
			const view = editorRef.current?.view;
			if (!view || slashStart === null) return;

			const from = slashStart;
			const to = view.state.selection.main.head;
			const typed = view.state.doc.sliceString(from, to);
			const replaceFrom = typed.startsWith("/") ? from : to;
			const insert = `{{${token.name}}}`;
			view.dispatch({
				changes: { from: replaceFrom, to, insert },
				selection: { anchor: replaceFrom + insert.length },
			});
			onChange(view.state.doc.toString());
			closeMenu();
			view.focus();
		},
		[closeMenu, onChange, slashStart],
	);

	const extensions = useMemo(() => {
		const slashKeymap = keymap.of([
			{
				key: "/",
				run: (view) => {
					openMenuAtCursor(view, true);
					return false;
				},
			},
			{
				key: "Escape",
				run: () => {
					if (!menuOpen && !showEmptyMenu) return false;
					closeMenu();
					return true;
				},
			},
		]);

		return [
			markdown(),
			variableTokenHighlight(secretNames),
			variableTokenTheme,
			slashKeymap,
			EditorView.updateListener.of((update) => {
				if (!update.docChanged || slashStart === null) return;
				updateMenuFilter(update.view);
			}),
			EditorView.theme({
				"&": {
					fontSize: "0.875rem",
					backgroundColor: "transparent",
				},
				".cm-content": {
					fontFamily: "inherit",
					minHeight: `${minHeightPx}px`,
				},
				".cm-scroller": {
					overflow: isAtMaxHeight ? "auto" : "hidden",
				},
				".cm-gutters": {
					display: "none",
				},
			}),
			EditorView.lineWrapping,
		];
	}, [
		closeMenu,
		isAtMaxHeight,
		menuOpen,
		minHeightPx,
		openMenuAtCursor,
		secretNames,
		showEmptyMenu,
		slashStart,
		updateMenuFilter,
	]);

	const handleChange = useCallback(
		(nextValue: string) => {
			onChange(nextValue);
		},
		[onChange],
	);

	function handleInsertButtonClick() {
		const view = editorRef.current?.view;
		if (!view) return;
		openMenuAtCursor(view, false);
	}

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50",
				className,
			)}
		>
			<CodeMirror
				ref={editorRef}
				value={value}
				height={`${editorHeightPx}px`}
				extensions={extensions}
				onChange={handleChange}
				placeholder={placeholder}
				basicSetup={{
					lineNumbers: false,
					foldGutter: false,
					highlightActiveLine: false,
				}}
				className="text-sm [&_.cm-editor]:outline-none [&_.cm-focused]:outline-none"
			/>
			<div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-2 py-1">
				<p className="text-[10px] text-muted-foreground">
					{tokens.length > 0
						? "Type / to insert a variable"
						: "Define variables in Advanced to use templates"}
				</p>
				{tokens.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 gap-1 px-2 text-[11px]"
						onClick={handleInsertButtonClick}
					>
						<BracesIcon className="size-3" />
						Insert variable
					</Button>
				) : null}
			</div>
			<TemplateTokenMenu
				open={menuOpen || showEmptyMenu}
				tokens={tokens}
				filter={menuFilter}
				onFilterChange={setMenuFilter}
				onSelect={insertToken}
				onClose={closeMenu}
				position={menuPosition}
			/>
		</div>
	);
}

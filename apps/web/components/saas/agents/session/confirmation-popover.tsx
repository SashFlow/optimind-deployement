"use client";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Loader } from "lucide-react";
import { useMemo } from "react";
import { useSessionInteractionContext } from "@/context/session-interaction-provider";

interface ParsedQaItem {
	index: string;
	question: string;
	answer: string;
}

interface ParsedConfirmationPrompt {
	intro: string | null;
	items: ParsedQaItem[];
	outro: string | null;
	/** Fallback when the prompt isn't structured Q&A. */
	raw: string | null;
}

export interface ConfirmationDialogProps {
	prompt: string;
	acceptLabel: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	submitting?: boolean;
	onAccept: () => void;
	onDecline: () => void;
}

/**
 * Best-effort parse of agent confirmation prompts shaped like:
 * intro + "1. Q: ... A: ..." lines + optional closing sentence.
 */
function parseConfirmationPrompt(prompt: string): ParsedConfirmationPrompt {
	const trimmed = prompt.trim();
	if (!trimmed) {
		return { intro: null, items: [], outro: null, raw: null };
	}

	const itemStartRe = /(?:^|\n)\s*(\d+)\.\s*Q:\s*/gi;
	const starts: {
		matchStart: number;
		contentStart: number;
		index: string;
	}[] = [];

	for (const match of trimmed.matchAll(itemStartRe)) {
		if (match.index === undefined || !match[1]) {
			continue;
		}
		const leadingNewline = match[0].startsWith("\n") ? 1 : 0;
		starts.push({
			matchStart: match.index + leadingNewline,
			contentStart: match.index + match[0].length,
			index: match[1],
		});
	}

	if (starts.length === 0) {
		return { intro: null, items: [], outro: null, raw: trimmed };
	}

	const intro =
		starts[0].matchStart > 0
			? trimmed.slice(0, starts[0].matchStart).trim()
			: null;

	const items: ParsedQaItem[] = [];
	let outro: string | null = null;

	for (let i = 0; i < starts.length; i++) {
		const { contentStart, index } = starts[i];
		const blockEnd =
			i + 1 < starts.length ? starts[i + 1].matchStart : trimmed.length;
		let block = trimmed.slice(contentStart, blockEnd).trim();

		// Peel a trailing paragraph after the last Q&A as the closing line.
		if (i === starts.length - 1) {
			const split = block.match(/^([\s\S]*?)\n+([A-Za-z][\s\S]*)$/);
			if (split?.[1] && split[2] && !/^A:/i.test(split[2].trim())) {
				block = split[1].trim();
				outro = split[2].trim();
			}
		}

		const qa = block.match(/^(.*?)\s*A:\s*([\s\S]+)$/is);
		if (!qa?.[1] || qa[2] === undefined) {
			continue;
		}

		items.push({
			index,
			question: qa[1].trim().replace(/\s+/g, " "),
			answer: qa[2].trim().replace(/\s+/g, " "),
		});
	}

	if (items.length === 0) {
		return { intro: null, items: [], outro: null, raw: trimmed };
	}

	return { intro, items, outro, raw: null };
}

/** Presentational confirmation dialog (session RPC or local demo). */
export function ConfirmationDialog({
	prompt,
	acceptLabel,
	checked,
	onCheckedChange,
	submitting = false,
	onAccept,
	onDecline,
}: ConfirmationDialogProps) {
	const parsed = useMemo(() => parseConfirmationPrompt(prompt), [prompt]);

	const subtitle =
		parsed.intro ??
		(parsed.raw
			? null
			: "Review the details below, then confirm to continue.");

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirmation-title"
			className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		>
			<div className="bg-background border-input/50 flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border drop-shadow-md/3">
				<div className="shrink-0 border-b border-input/40 px-5 pt-5 pb-3">
					<h2
						id="confirmation-title"
						className="text-lg font-semibold"
					>
						Please confirm
					</h2>
					{subtitle ? (
						<p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-wrap">
							{subtitle}
						</p>
					) : null}
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
					{parsed.raw ? (
						<p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
							{parsed.raw}
						</p>
					) : (
						<div className="flex flex-col gap-3">
							<ol className="flex flex-col gap-2.5">
								{parsed.items.map((item) => (
									<li
										key={item.index}
										className="bg-muted/30 border-input/40 rounded-md border px-3 py-2.5"
									>
										<div className="flex gap-2.5">
											<span className="text-muted-foreground w-5 shrink-0 pt-0.5 text-xs font-medium tabular-nums">
												{item.index}.
											</span>
											<div className="min-w-0 flex-1 space-y-1">
												<p className="text-foreground text-sm leading-snug">
													<span className="text-muted-foreground mr-1.5 text-xs font-semibold tracking-wide uppercase">
														Q
													</span>
													{item.question}
												</p>
												<p className="text-muted-foreground text-sm leading-snug">
													<span className="text-foreground/70 mr-1.5 text-xs font-semibold tracking-wide uppercase">
														A
													</span>
													{item.answer}
												</p>
											</div>
										</div>
									</li>
								))}
							</ol>

							{parsed.outro ? (
								<p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
									{parsed.outro}
								</p>
							) : null}
						</div>
					)}
				</div>

				<div className="bg-background shrink-0 space-y-3 border-t border-input/40 px-5 pt-3 pb-5">
					<label className="flex cursor-pointer items-start gap-3 rounded-md border border-input/60 bg-muted/20 p-3">
						<Checkbox
							checked={checked}
							disabled={submitting}
							onCheckedChange={(value) =>
								onCheckedChange(value === true)
							}
							className="mt-0.5"
							aria-labelledby="confirmation-accept-label"
						/>
						<span
							id="confirmation-accept-label"
							className="text-sm leading-snug"
						>
							{acceptLabel}
						</span>
					</label>

					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={submitting}
							onClick={onDecline}
						>
							Decline
						</Button>
						<Button
							type="button"
							disabled={!checked || submitting}
							onClick={onAccept}
						>
							{submitting && (
								<Loader className="mr-2 size-4 animate-spin" />
							)}
							Confirm
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Centered confirmation dialog opened via the agent `start_confirmation` RPC. */
export function ConfirmationPopover() {
	const ctx = useSessionInteractionContext();
	const confirmation = ctx?.confirmation;
	if (!confirmation?.open) {
		return null;
	}

	const { options, checked, setChecked, submitting, accept, decline } =
		confirmation;

	return (
		<ConfirmationDialog
			prompt={options.prompt}
			acceptLabel={options.acceptLabel}
			checked={checked}
			onCheckedChange={setChecked}
			submitting={submitting}
			onAccept={() => void accept()}
			onDecline={() => void decline()}
		/>
	);
}

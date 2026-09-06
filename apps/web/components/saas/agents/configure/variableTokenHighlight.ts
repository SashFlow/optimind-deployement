import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";

const variableMark = Decoration.mark({ class: "cm-template-variable" });
const secretMark = Decoration.mark({ class: "cm-template-secret" });

const TOKEN_REGEX = /\{\{([^}\n]+)\}\}/g;

function buildDecorations(view: EditorView, secretNames: Set<string>) {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const regex = new RegExp(TOKEN_REGEX.source, "g");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const start = from + match.index;
			const end = start + match[0].length;
			const name = match[1]?.trim() ?? "";
			const mark = secretNames.has(name) ? secretMark : variableMark;
			builder.add(start, end, mark);
		}
	}

	return builder.finish();
}

export function variableTokenHighlight(secretNames: Set<string>) {
	return ViewPlugin.fromClass(
		class {
			decorations;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, secretNames);
			}

			update(update: import("@codemirror/view").ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(
						update.view,
						secretNames,
					);
				}
			}
		},
		{
			decorations: (plugin) => plugin.decorations,
		},
	);
}

export const variableTokenTheme = EditorView.baseTheme({
	".cm-template-variable": {
		backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)",
		color: "var(--primary)",
		borderRadius: "0.25rem",
		padding: "0 0.125rem",
		fontFamily:
			"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
		fontSize: "0.8125em",
	},
	".cm-template-secret": {
		backgroundColor:
			"color-mix(in oklch, var(--color-amber-500) 14%, transparent)",
		color: "var(--color-amber-700)",
		borderRadius: "0.25rem",
		padding: "0 0.125rem",
		fontFamily:
			"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
		fontSize: "0.8125em",
	},
});

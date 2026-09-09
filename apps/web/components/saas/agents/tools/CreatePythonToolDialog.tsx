"use client";

import { Button } from "@repo/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import * as React from "react";
import type { ToolCreateInput, ToolDefinition } from "@/services/api/types";

const DEFAULT_PYTHON_TOOL_SCRIPT = `from livekit.agents import function_tool, RunContext

class Tools:
    def __init__(self, host):
        self.host = host  # .ctx, .state, .agent (agent set after session start)

    @function_tool()
    async def example(self, context: RunContext, value: str) -> str:
        """Describe when the agent should call this tool."""
        return f"ok:{value}"
`;

type CreatePythonToolDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tool?: ToolDefinition | null;
	onSubmit: (input: ToolCreateInput) => Promise<ToolDefinition>;
	isPending?: boolean;
};

export function CreatePythonToolDialog({
	open,
	onOpenChange,
	tool = null,
	onSubmit,
	isPending = false,
}: CreatePythonToolDialogProps) {
	const isEditing = Boolean(tool);
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [script, setScript] = React.useState(DEFAULT_PYTHON_TOOL_SCRIPT);

	function resetForm() {
		setName("");
		setDescription("");
		setScript(DEFAULT_PYTHON_TOOL_SCRIPT);
	}

	function populateFromTool(nextTool: ToolDefinition) {
		const config = nextTool.config ?? {};
		setName(nextTool.name);
		setDescription(nextTool.description ?? "");
		setScript(
			typeof config.script === "string" && config.script.trim()
				? config.script
				: DEFAULT_PYTHON_TOOL_SCRIPT,
		);
	}

	React.useEffect(() => {
		if (!open) {
			return;
		}
		if (tool) {
			populateFromTool(tool);
			return;
		}
		resetForm();
	}, [open, tool]);

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			resetForm();
		}
		onOpenChange(nextOpen);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName || !script.trim()) {
			return;
		}

		await onSubmit({
			name: trimmedName,
			description: description.trim(),
			tool_type: "python",
			config: { script },
			parameters_schema: {},
		});
		handleOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-3xl">
				<form onSubmit={(e) => void handleSubmit(e)}>
					<DialogHeader>
						<DialogTitle>
							{isEditing
								? "Edit Python tool"
								: "Create Python tool"}
						</DialogTitle>
						<DialogDescription>
							Define a class with{" "}
							<code className="text-xs">@function_tool</code>{" "}
							methods. The worker loads this class at runtime and
							passes a <code className="text-xs">host</code> (
							<code className="text-xs">.ctx</code>,{" "}
							<code className="text-xs">.state</code>,{" "}
							<code className="text-xs">.agent</code>). Parameter
							schemas come from the method signatures—not JSON.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="python-tool-name">Name</Label>
							<Input
								id="python-tool-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Medical exam tools"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="python-tool-description">
								Description
							</Label>
							<Textarea
								id="python-tool-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What this tool pack does for the agent"
								rows={2}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="python-tool-script">
								Python tool class
							</Label>
							<Textarea
								id="python-tool-script"
								value={script}
								onChange={(e) => setScript(e.target.value)}
								className="min-h-56 font-mono text-xs"
								required
							/>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending
								? isEditing
									? "Saving..."
									: "Creating..."
								: isEditing
									? "Save changes"
									: "Create Python tool"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

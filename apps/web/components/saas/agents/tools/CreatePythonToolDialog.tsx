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

type CreatePythonToolDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: ToolCreateInput) => Promise<ToolDefinition>;
	isPending?: boolean;
};

export function CreatePythonToolDialog({
	open,
	onOpenChange,
	onCreate,
	isPending = false,
}: CreatePythonToolDialogProps) {
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [script, setScript] = React.useState(
		"def run(args: dict) -> dict:\n    # Write your tool logic here\n    return {}",
	);
	const [parametersSchema, setParametersSchema] = React.useState("{}");

	function resetForm() {
		setName("");
		setDescription("");
		setScript(
			"def run(args: dict) -> dict:\n    # Write your tool logic here\n    return {}",
		);
		setParametersSchema("{}");
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) resetForm();
		onOpenChange(nextOpen);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName || !script.trim()) return;

		let parsedParameters: Record<string, unknown> = {};
		try {
			parsedParameters = JSON.parse(parametersSchema || "{}") as Record<
				string,
				unknown
			>;
		} catch {
			return;
		}

		await onCreate({
			name: trimmedName,
			description: description.trim(),
			tool_type: "python",
			config: { script },
			parameters_schema: parsedParameters,
		});
		handleOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-3xl">
				<form onSubmit={(e) => void handleSubmit(e)}>
					<DialogHeader>
						<DialogTitle>Create Python tool</DialogTitle>
						<DialogDescription>
							Write a Python function the agent can execute during
							a session.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="python-tool-name">Name</Label>
							<Input
								id="python-tool-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Calculate EMI"
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
								placeholder="When should the agent use this function?"
								rows={2}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="python-tool-script">
								Python script
							</Label>
							<Textarea
								id="python-tool-script"
								value={script}
								onChange={(e) => setScript(e.target.value)}
								className="min-h-56 font-mono text-xs"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="python-tool-params">
								Parameters schema (JSON)
							</Label>
							<Textarea
								id="python-tool-params"
								value={parametersSchema}
								onChange={(e) =>
									setParametersSchema(e.target.value)
								}
								className="font-mono text-xs"
								rows={3}
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
							{isPending ? "Creating..." : "Create Python tool"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

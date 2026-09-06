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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { Textarea } from "@repo/ui/textarea";
import * as React from "react";
import type { ToolCreateInput, ToolDefinition } from "@/services/api/types";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type CreateApiToolDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: ToolCreateInput) => Promise<ToolDefinition>;
	isPending?: boolean;
};

export function CreateApiToolDialog({
	open,
	onOpenChange,
	onCreate,
	isPending = false,
}: CreateApiToolDialogProps) {
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [method, setMethod] =
		React.useState<(typeof HTTP_METHODS)[number]>("POST");
	const [url, setUrl] = React.useState("");
	const [headers, setHeaders] = React.useState("{}");
	const [parametersSchema, setParametersSchema] = React.useState("{}");

	function resetForm() {
		setName("");
		setDescription("");
		setMethod("POST");
		setUrl("");
		setHeaders("{}");
		setParametersSchema("{}");
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) resetForm();
		onOpenChange(nextOpen);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		const trimmedUrl = url.trim();
		if (!trimmedName || !trimmedUrl) return;

		let parsedHeaders: Record<string, string> = {};
		let parsedParameters: Record<string, unknown> = {};
		try {
			parsedHeaders = JSON.parse(headers || "{}") as Record<
				string,
				string
			>;
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
			tool_type: "http",
			config: { method, url: trimmedUrl, headers: parsedHeaders },
			parameters_schema: parsedParameters,
		});
		handleOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<form onSubmit={(e) => void handleSubmit(e)}>
					<DialogHeader>
						<DialogTitle>Create API tool</DialogTitle>
						<DialogDescription>
							Define an HTTP endpoint the agent can call during a
							session.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="api-tool-name">Name</Label>
							<Input
								id="api-tool-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Lookup order status"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="api-tool-description">
								Description
							</Label>
							<Textarea
								id="api-tool-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="When should the agent use this API?"
								rows={2}
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-[120px_1fr]">
							<div className="space-y-2">
								<Label>Method</Label>
								<Select
									value={method}
									onValueChange={(value) =>
										value &&
										setMethod(
											value as (typeof HTTP_METHODS)[number],
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{HTTP_METHODS.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="api-tool-url">URL</Label>
								<Input
									id="api-tool-url"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://api.example.com/orders"
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="api-tool-headers">
								Headers (JSON)
							</Label>
							<Textarea
								id="api-tool-headers"
								value={headers}
								onChange={(e) => setHeaders(e.target.value)}
								className="font-mono text-xs"
								rows={3}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="api-tool-params">
								Parameters schema (JSON)
							</Label>
							<Textarea
								id="api-tool-params"
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
							{isPending ? "Creating..." : "Create API tool"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

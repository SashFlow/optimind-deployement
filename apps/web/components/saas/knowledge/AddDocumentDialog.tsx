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
import { cn } from "@repo/ui/utils";
import { FileUpIcon } from "lucide-react";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import type {
	CreateDocumentInput,
	KnowledgeDocument,
	KnowledgeDocumentSourceType,
} from "@/services/api/types";

const SOURCE_TYPES: {
	value: KnowledgeDocumentSourceType;
	label: string;
}[] = [
	{ value: "UPLOAD", label: "Upload file" },
	{ value: "TEXT", label: "Paste text" },
	{ value: "URL", label: "URL" },
];

const ACCEPTED = {
	"application/pdf": [".pdf"],
	"text/plain": [".txt"],
	"text/markdown": [".md", ".markdown"],
	"text/csv": [".csv"],
	"application/json": [".json"],
	"text/html": [".html", ".htm"],
};

type AddDocumentDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: CreateDocumentInput) => Promise<KnowledgeDocument>;
	isPending?: boolean;
};

export function AddDocumentDialog({
	open,
	onOpenChange,
	onCreate,
	isPending = false,
}: AddDocumentDialogProps) {
	const [sourceType, setSourceType] =
		React.useState<KnowledgeDocumentSourceType>("UPLOAD");
	const [sourceUrl, setSourceUrl] = React.useState("");
	const [content, setContent] = React.useState("");
	const [file, setFile] = React.useState<File | null>(null);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		multiple: false,
		disabled: isPending || sourceType !== "UPLOAD",
		accept: ACCEPTED,
		onDrop: (accepted) => {
			setFile(accepted[0] ?? null);
		},
	});

	function resetForm() {
		setSourceType("UPLOAD");
		setSourceUrl("");
		setContent("");
		setFile(null);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			resetForm();
		}
		onOpenChange(nextOpen);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (sourceType === "UPLOAD" && !file) {
			return;
		}
		if (sourceType === "TEXT" && !content.trim()) {
			return;
		}
		if (sourceType === "URL" && !sourceUrl.trim()) {
			return;
		}

		await onCreate({
			sourceType,
			sourceUrl: sourceType === "URL" ? sourceUrl.trim() : undefined,
			content: sourceType === "TEXT" ? content.trim() : undefined,
			file: sourceType === "UPLOAD" ? (file ?? undefined) : undefined,
		});
		handleOpenChange(false);
	}

	const canSubmit =
		(sourceType === "UPLOAD" && !!file) ||
		(sourceType === "TEXT" && content.trim().length > 0) ||
		(sourceType === "URL" && sourceUrl.trim().length > 0);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<form onSubmit={(e) => void handleSubmit(e)}>
					<DialogHeader>
						<DialogTitle>Add document</DialogTitle>
						<DialogDescription>
							Upload a file or add text/URL. The title is
							generated automatically, then we chunk, embed, and
							queue the document for search.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label>Source type</Label>
							<Select
								value={sourceType}
								onValueChange={(value) => {
									if (!value) {
										return;
									}
									setSourceType(
										value as KnowledgeDocumentSourceType,
									);
									setFile(null);
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SOURCE_TYPES.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{sourceType === "UPLOAD" ? (
							<div
								{...getRootProps()}
								className={cn(
									"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
									isDragActive
										? "border-foreground bg-muted/60"
										: "border-muted-foreground/30 bg-muted/20 hover:bg-muted/40",
								)}
							>
								<input {...getInputProps()} />
								<FileUpIcon className="size-6 text-muted-foreground" />
								{file ? (
									<div>
										<p className="font-medium text-sm">
											{file.name}
										</p>
										<p className="text-muted-foreground text-xs">
											{(file.size / 1024).toFixed(1)} KB ·
											title will be auto-generated
										</p>
									</div>
								) : (
									<div>
										<p className="font-medium text-sm">
											Drop a file here, or click to browse
										</p>
										<p className="text-muted-foreground text-xs">
											PDF, TXT, MD, CSV, JSON, HTML
										</p>
									</div>
								)}
							</div>
						) : null}

						{sourceType === "TEXT" ? (
							<div className="space-y-2">
								<Label htmlFor="doc-content">Content</Label>
								<Textarea
									id="doc-content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									placeholder="Paste document text… Title is taken from the first line."
									rows={8}
									required
								/>
							</div>
						) : null}

						{sourceType === "URL" ? (
							<div className="space-y-2">
								<Label htmlFor="doc-url">URL</Label>
								<Input
									id="doc-url"
									type="url"
									value={sourceUrl}
									onChange={(e) =>
										setSourceUrl(e.target.value)
									}
									placeholder="https://example.com/docs"
									required
								/>
								<p className="text-muted-foreground text-xs">
									Title is derived from the URL path.
								</p>
							</div>
						) : null}
					</div>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isPending || !canSubmit}
						>
							{isPending ? "Processing…" : "Add & process"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import { Button } from "@repo/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { PlusIcon } from "lucide-react";
import * as React from "react";

type ResourceCreateDialogProps = {
	title: string;
	description: string;
	nameLabel?: string;
	namePlaceholder: string;
	descriptionLabel?: string;
	descriptionPlaceholder: string;
	submitLabel: string;
	loading?: boolean;
	onCreate: (name: string, description: string) => void | Promise<void>;
};

export function ResourceCreateDialog({
	title,
	description,
	nameLabel = "Name",
	namePlaceholder,
	descriptionLabel = "Description (optional)",
	descriptionPlaceholder,
	submitLabel,
	loading = false,
	onCreate,
}: ResourceCreateDialogProps) {
	const [open, setOpen] = React.useState(false);
	const [name, setName] = React.useState("");
	const [details, setDetails] = React.useState("");

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setName("");
			setDetails("");
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmedName = name.trim();

		if (!trimmedName) {
			return;
		}

		onCreate(trimmedName, details.trim());
		handleOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button className="gap-2" loading={loading}>
					<PlusIcon className="size-4" />
					{submitLabel}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="resource-name">{nameLabel}</Label>
						<Input
							id="resource-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={namePlaceholder}
							autoFocus
							required
							disabled={loading}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="resource-description">
							{descriptionLabel}
						</Label>
						<Textarea
							id="resource-description"
							value={details}
							onChange={(event) => setDetails(event.target.value)}
							placeholder={descriptionPlaceholder}
							rows={3}
							disabled={loading}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button type="submit" loading={loading}>
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

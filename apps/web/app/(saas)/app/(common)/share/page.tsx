"use client";

import { modes, scenariosOptions } from "@constants";
import type { DemoLinks } from "@repo/database/prisma/generated/client/client";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { Textarea } from "@repo/ui/textarea";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Copy,
	LinkIcon,
	Loader2,
	Power,
	RefreshCcw,
	Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const ITEMS_PER_PAGE = 5;

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button
			size="icon"
			variant="ghost"
			onClick={handleCopy}
			className="h-7 w-7"
		>
			{copied ? (
				<Check className="h-3.5 w-3.5" />
			) : (
				<Copy className="h-3.5 w-3.5" />
			)}
		</Button>
	);
}

const SharePage = () => {
	const [demoLinks, setDemoLinks] = useState<DemoLinks[]>([]);
	const [isLoadingLinks, setIsLoadingLinks] = useState(false);
	const [isSubmittingLink, setIsSubmittingLink] = useState(false);
	const [actionId, setActionId] = useState<string | null>(null);
	const [linksError, setLinksError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		client: "",
		description: "",
		sessions: 1,
		slugs: ["medical-examination"],
		mode: "audio",
	});
	const totalPages = Math.max(
		1,
		Math.ceil(demoLinks.length / ITEMS_PER_PAGE),
	);
	const paginatedLinks = demoLinks.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE,
	);

	const loadDemoLinks = async () => {
		setIsLoadingLinks(true);
		setLinksError(null);

		try {
			const data = await orpcClient.links.list({
				query: undefined,
				limit: 100,
				offset: 0,
			});
			setDemoLinks(data as DemoLinks[]);
			setCurrentPage(1);
		} catch {
			setLinksError("Failed to load demo links. Please retry.");
		} finally {
			setIsLoadingLinks(false);
		}
	};

	useEffect(() => {
		loadDemoLinks();
	}, []);

	const onFormChange = (key: any, value: any) => {
		setForm({ ...form, [key]: value });
	};

	const toggleScenarioSelection = (slug: string, checked: boolean) => {
		setForm((prev) => ({
			...prev,
			slugs: checked
				? Array.from(new Set([...prev.slugs, slug]))
				: prev.slugs.filter((selectedSlug) => selectedSlug !== slug),
		}));
	};

	const handleGenerateLink = async () => {
		setIsSubmittingLink(true);
		setLinksError(null);

		try {
			const combinedSlug = form.slugs.join(",");

			await orpcClient.links.create({
				client: form.client,
				description: form.description,
				slug: combinedSlug,
				mode: form.mode,
				sessions: Number(form.sessions),
			});

			await loadDemoLinks();
			setDialogOpen(false);
			setEditingId(null);
			setForm({
				client: "",
				description: "",
				sessions: 1,
				slugs: ["medical-examination"],
				mode: "audio",
			});
		} catch {
			setLinksError("Failed to save demo link. Please retry.");
		} finally {
			setIsSubmittingLink(false);
		}
	};

	const handleUpdateLink = async () => {
		if (editingId == null) {
			return;
		}

		setIsSubmittingLink(true);
		setLinksError(null);

		try {
			const combinedSlug = form.slugs.join(",");

			await orpcClient.links.update({
				id: editingId,
				client: form.client,
				description: form.description,
				slug: combinedSlug,
				mode: form.mode,
				sessions: Number(form.sessions),
			});

			await loadDemoLinks();
			setDialogOpen(false);
			setEditingId(null);
		} catch {
			setLinksError("Failed to update demo link. Please retry.");
		} finally {
			setIsSubmittingLink(false);
		}
	};

	const openEditDialog = (link: DemoLinks) => {
		const parsedSlugs = link.slug
			.split(",")
			.map((slug) => slug.trim())
			.filter(Boolean);

		setEditingId(link.id);
		setForm({
			client: link.client,
			description: link.description,
			sessions: link.approvedSessions,
			slugs:
				parsedSlugs.length > 0 ? parsedSlugs : ["medical-examination"],
			mode: link.mode,
		});
		setDialogOpen(true);
	};

	const handleTogglePublished = async (link: DemoLinks) => {
		setActionId(link.id);
		setLinksError(null);

		try {
			if (link.published) {
				await orpcClient.links.disable({
					id: link.id,
					approvedSessions: 0,
				});
			} else {
				await orpcClient.links.enable({
					id: link.id,
					published: true,
				});
			}

			await loadDemoLinks();
		} catch {
			setLinksError("Failed to change published state.");
		} finally {
			setActionId(null);
		}
	};

	const handleDeleteLink = async (id: string) => {
		setActionId(id);
		setLinksError(null);

		try {
			await orpcClient.links.delete({ id });
			await loadDemoLinks();
		} catch {
			setLinksError("Failed to delete demo link.");
		} finally {
			setActionId(null);
		}
	};

	const origin = typeof window !== "undefined" ? window.location.origin : "";
	return (
		<main className="bg-background px-4 py-8 md:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex items-start justify-end gap-4">
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={loadDemoLinks}
							disabled={isLoadingLinks}
						>
							{isLoadingLinks ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<RefreshCcw className="mr-2 h-4 w-4" />
							)}
							Refresh
						</Button>
						<Button
							onClick={() => {
								setEditingId(null);
								setForm({
									client: "",
									description: "",
									sessions: 1,
									slugs: ["medical-examination"],
									mode: "audio",
								});
								setDialogOpen(true);
							}}
							className="shrink-0"
						>
							<LinkIcon className="mr-2 h-4 w-4" />
							Generate Link
						</Button>
					</div>
				</div>
				{linksError ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
						{linksError}
					</div>
				) : null}

				{/* Demo Links Table */}
				<section className="space-y-3">
					<h2 className="text-base font-semibold">Demo Links</h2>
					<div className="space-y-3 md:hidden">
						{isLoadingLinks ? (
							<div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
								<span className="inline-flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading demo links...
								</span>
							</div>
						) : paginatedLinks.length > 0 ? (
							paginatedLinks.map((link) => {
								const url = `${origin}/demo/${link.token}`;
								const isBusy =
									actionId === link.id ||
									actionId === link.token;

								return (
									<div
										key={link.id}
										className="space-y-3 rounded-lg border p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-sm font-medium">
													{link.client}
												</p>
												<p className="text-xs text-muted-foreground">
													Sessions:{" "}
													{link.approvedSessions}
												</p>
											</div>
											<Badge
												variant={
													link.published
														? "default"
														: "secondary"
												}
											>
												{link.published
													? "Published"
													: "Unpublished"}
											</Badge>
										</div>

										<div className="flex items-center justify-between gap-2">
											<Badge
												variant="secondary"
												className="max-w-[75%] truncate font-mono text-xs"
											>
												{link.token}
											</Badge>
											<CopyButton text={url} />
										</div>

										<div className="flex justify-end gap-1">
											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8"
												onClick={() =>
													openEditDialog(link)
												}
												disabled={isBusy}
											>
												<RefreshCcw className="h-4 w-4" />
											</Button>

											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8"
												onClick={() =>
													handleTogglePublished(link)
												}
												disabled={isBusy}
											>
												<Power className="h-4 w-4" />
											</Button>

											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8"
												onClick={() =>
													handleDeleteLink(link.id)
												}
												disabled={isBusy}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								);
							})
						) : (
							<div className="text-muted-foreground flex h-24 items-center justify-center rounded-lg border text-center text-sm">
								No demo links yet. Click{" "}
								<strong className="mx-1">Generate Link</strong>{" "}
								to create one.
							</div>
						)}
					</div>

					<div className="hidden rounded-lg border md:block">
						<div className="w-full overflow-x-auto">
							<Table className="min-w-[760px]">
								<TableHeader>
									<TableRow>
										<TableHead>Label</TableHead>
										<TableHead>Link</TableHead>
										<TableHead>Sessions</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-[220px] text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoadingLinks ? (
										<TableRow>
											<TableCell
												colSpan={6}
												className="h-24 text-center text-sm"
											>
												<span className="inline-flex items-center gap-2 text-muted-foreground">
													<Loader2 className="h-4 w-4 animate-spin" />
													Loading demo links...
												</span>
											</TableCell>
										</TableRow>
									) : paginatedLinks.length > 0 ? (
										paginatedLinks.map((link) => {
											const url = `${origin}/demo/${link.token}`;
											const isBusy =
												actionId === link.id ||
												actionId === link.token;

											return (
												<TableRow key={link.id}>
													<TableCell className="font-medium">
														{link.client}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-1">
															<Badge
																variant="secondary"
																className="font-mono text-xs"
															>
																{link.token}
															</Badge>
															<CopyButton
																text={url}
															/>
														</div>
													</TableCell>
													<TableCell>
														{link.approvedSessions}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																link.published
																	? "default"
																	: "secondary"
															}
														>
															{link.published
																? "Published"
																: "Unpublished"}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-1">
															<Button
																size="icon"
																variant="ghost"
																className="h-7 w-7"
																onClick={() =>
																	openEditDialog(
																		link,
																	)
																}
																disabled={
																	isBusy
																}
															>
																<RefreshCcw className="h-3.5 w-3.5" />
															</Button>

															<Button
																size="icon"
																variant="ghost"
																className="h-7 w-7"
																onClick={() =>
																	handleTogglePublished(
																		link,
																	)
																}
																disabled={
																	isBusy
																}
															>
																<Power className="h-3.5 w-3.5" />
															</Button>

															<Button
																size="icon"
																variant="ghost"
																className="h-7 w-7"
																onClick={() =>
																	handleDeleteLink(
																		link.id,
																	)
																}
																disabled={
																	isBusy
																}
															>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})
									) : (
										<TableRow>
											<TableCell
												colSpan={6}
												className="text-muted-foreground h-24 text-center text-sm"
											>
												No demo links yet. Click{" "}
												<strong>Generate Link</strong>{" "}
												to create one.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					</div>

					{/* Pagination */}
					{demoLinks.length > ITEMS_PER_PAGE && (
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Page {currentPage} of {totalPages}
							</span>
							<div className="flex gap-1">
								<Button
									size="icon"
									variant="ghost"
									onClick={() =>
										setCurrentPage((p) =>
											Math.max(1, p - 1),
										)
									}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									onClick={() =>
										setCurrentPage((p) =>
											Math.min(totalPages, p + 1),
										)
									}
									disabled={currentPage === totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</section>

				{/* Generate Link Dialog */}
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{editingId
									? "Update Demo Link"
									: "Generate Demo Link"}
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								<label
									htmlFor="client"
									className="text-sm font-medium"
								>
									Client Name
								</label>
								<Input
									placeholder="e.g. ABC Corp"
									value={form.client}
									name="client"
									onChange={(e) =>
										onFormChange("client", e.target.value)
									}
									autoFocus
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="description"
									className="text-sm font-medium"
								>
									Description
								</label>
								<Textarea
									placeholder="Briefly describe this demo setup"
									value={form.description}
									name="description"
									onChange={(e) =>
										onFormChange(
											"description",
											e.target.value,
										)
									}
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="mode"
									className="text-sm font-medium"
								>
									Mode
								</label>
								<div className="flex gap-2 w-full">
									{modes.map((mode) => (
										<Button
											key={mode.id}
											variant={
												form.mode === mode.id
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() => {
												onFormChange("mode", mode.id);
											}}
											className="w-full"
										>
											{mode.label}
										</Button>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="sessions"
									className="text-sm font-medium"
								>
									Sessions
								</label>
								<Input
									type="number"
									min={1}
									step={1}
									inputMode="numeric"
									value={form.sessions}
									onChange={(e) =>
										onFormChange(
											"sessions",
											Number(e.target.value),
										)
									}
								/>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="scenario"
									className="text-sm font-medium"
								>
									Select Scenario Options
								</label>
								<div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
									{scenariosOptions.map(
										(option: {
											title: string;
											slug: string;
										}) => {
											const checked = form.slugs.includes(
												option.slug,
											);

											return (
												<label
													key={option.slug}
													htmlFor={`scenario-${option.slug}`}
													className="flex cursor-pointer items-center gap-2 text-sm"
												>
													<Checkbox
														id={`scenario-${option.slug}`}
														checked={checked}
														onCheckedChange={(
															state,
														) =>
															toggleScenarioSelection(
																option.slug,
																state === true,
															)
														}
													/>
													<span>{option.title}</span>
												</label>
											);
										},
									)}
								</div>
								<p className="text-muted-foreground text-xs">
									Selected scenarios will be saved as a
									comma-separated value on a single demo link.
								</p>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={
									editingId
										? handleUpdateLink
										: handleGenerateLink
								}
								disabled={
									isSubmittingLink ||
									!form.client.trim() ||
									form.sessions < 1 ||
									form.slugs.length < 1
								}
							>
								{isSubmittingLink ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{editingId ? "Update" : "Generate"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</main>
	);
};

export default SharePage;

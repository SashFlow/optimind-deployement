"use client";

import { WelcomeImage } from "@components/app/welcome-view";
import { popularIndianLanguages, scenariosOptions } from "@constants";
import type { DemoLinks } from "@repo/database/prisma/generated/client/client";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
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
	File,
	Venus as GenderFemaleIcon,
	Mars as GenderMaleIcon,
	Link as LinkIcon,
	Loader2,
	Power,
	RefreshCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const modes = [
	{ id: "audio", label: "Audio Assistant" },
	{ id: "avatar", label: "Avatar Assistant" },
] as const;

const agents = [
	{
		name: "Sanjay",
		url: "/sanjay.mp4",
		icon: <GenderMaleIcon size={48} />,
	},
	{
		name: "Samira",
		url: "/anjali.mp4",
		icon: <GenderFemaleIcon size={48} />,
	},
];

type Mode = (typeof modes)[number]["id"];

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

function AudioWaveformPreview() {
	return (
		<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
			<WelcomeImage />
		</div>
	);
}

export default function Page() {
	// Demo links table state
	const router = useRouter();
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
		slug: "medical-examination",
		mode: "audio",
	});

	// Playground state
	const [selectedMode, setSelectedMode] = useState<Mode>("avatar");
	const [selectedScenario, setSelectedScenario] = useState(
		"medical-examination",
	);
	const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(
		null,
	);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("English");

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

	const handleGenerateLink = async () => {
		setIsSubmittingLink(true);
		setLinksError(null);

		try {
			await orpcClient.links.create({
				client: form.client,
				description: form.description,
				slug: form.slug,
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
				slug: "medical-examination",
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
			await orpcClient.links.update({
				id: editingId,
				client: form.client,
				description: form.description,
				slug: form.slug,
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
		setEditingId(link.id);
		setForm({
			client: link.client,
			description: link.description,
			sessions: link.approvedSessions,
			slug: link.slug,
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

	const nextHref =
		selectedAgentSlug == null
			? null
			: `app/${selectedMode}/${selectedScenario}?language=${selectedLanguage}&selectedAgent=${selectedAgentSlug}`;

	const origin = typeof window !== "undefined" ? window.location.origin : "";

	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10">
				{/* Page header */}
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-3xl font-semibold tracking-tight">
							Sashflow
						</h1>
						<p className="text-muted-foreground text-sm">
							Manage demo links and explore assistant
							configurations.
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => router.push("/app/browser")}
							disabled={isLoadingLinks}
						>
							{isLoadingLinks ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<File className="mr-2 h-4 w-4" />
							)}
							Records
						</Button>
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
									slug: "medical-examination",
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
									Select Scenario Option
								</label>
								<Select
									value={form.slug}
									onValueChange={(e) =>
										onFormChange("slug", e)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a scenario" />
									</SelectTrigger>
									<SelectContent>
										{scenariosOptions.map(
											(option: {
												title: string;
												slug: string;
											}) => (
												<SelectItem
													key={option.slug}
													value={option.slug}
												>
													{option.title}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
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
									form.sessions < 1
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

				{/* Demo Links Table */}
				<section className="space-y-3">
					<h2 className="text-base font-semibold">Demo Links</h2>
					<div className="rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Label</TableHead>
									<TableHead>Link</TableHead>
									<TableHead>Sessions</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[320px] text-right">
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
															disabled={isBusy}
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
															disabled={isBusy}
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
															disabled={isBusy}
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
											<strong>Generate Link</strong> to
											create one.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
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

				{/* Playground Card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Playground</CardTitle>
						<CardDescription>
							Configure and launch an assistant session directly.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Mode selector */}
						<div className="flex justify-between">
							<div className="flex gap-2">
								{modes.map((mode) => (
									<Button
										key={mode.id}
										variant={
											selectedMode === mode.id
												? "default"
												: "outline"
										}
										size="sm"
										onClick={() => {
											setSelectedMode(mode.id);
											setSelectedAgentSlug(null);
										}}
									>
										{mode.label}
									</Button>
								))}
							</div>
							<div className="flex gap-2">
								<Select
									value={selectedScenario}
									onValueChange={setSelectedScenario}
								>
									<SelectTrigger className="w-[260px]">
										<SelectValue placeholder="Select a use-case" />
									</SelectTrigger>
									<SelectContent>
										{scenariosOptions.map(
											(option: {
												title: string;
												slug: string;
											}) => (
												<SelectItem
													key={option.title}
													value={option.slug}
												>
													{option.title}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Agent selector */}
						<div className="grid gap-4 sm:grid-cols-2">
							{agents.map((agent) => {
								const isSelected =
									agent.name === selectedAgentSlug;
								return (
									<Card
										key={agent.name}
										className={
											isSelected
												? "border-primary ring-primary/20 ring-2"
												: undefined
										}
									>
										<CardHeader className="space-y-3 pb-3">
											{selectedMode === "audio" ? (
												<AudioWaveformPreview />
											) : (
												<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center rounded-lg border">
													{agent.icon}
												</div>
											)}
											<CardTitle className="text-center text-sm">
												Dr. {agent.name}
											</CardTitle>
										</CardHeader>
										<CardContent className="pt-0">
											<Button
												className="w-full"
												size="sm"
												variant={
													isSelected
														? "default"
														: "outline"
												}
												onClick={() =>
													setSelectedAgentSlug(
														agent.name,
													)
												}
											>
												{isSelected
													? "Selected"
													: "Select"}
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>

						{/* Language + Proceed */}
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div className="space-y-1.5">
								<p className="text-sm font-medium">
									Preferred Language
								</p>
								<Select
									value={selectedLanguage}
									onValueChange={setSelectedLanguage}
								>
									<SelectTrigger className="w-[260px]">
										<SelectValue placeholder="Select a language" />
									</SelectTrigger>
									<SelectContent>
										{popularIndianLanguages.map(
											(language) => (
												<SelectItem
													key={language}
													value={language}
												>
													{language}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>

							{nextHref ? (
								<Button asChild className="w-full sm:w-auto">
									<Link href={nextHref}>Proceed</Link>
								</Button>
							) : (
								<Button className="w-full sm:w-auto" disabled>
									Proceed
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

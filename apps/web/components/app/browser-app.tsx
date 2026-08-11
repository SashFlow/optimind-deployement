"use client";

import { Button } from "@repo/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
import { Pagination } from "@saas/shared/components/Pagination";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	ArrowUpSquare as ArrowSquareOut,
	Download as DownloadSimple,
	File,
	Folder,
	Loader2,
	RefreshCcw,
	FileWarning as WarningCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { formatBytes, formatUpdatedAt } from "@/lib/browser-format";
import type { BrowserListResponse } from "@/types/browser";

const ITEMS_PER_PAGE = 10;

async function fetchBrowserData(prefix: string, signal?: AbortSignal) {
	const response = await orpcClient.browser.list(
		{ prefix: prefix },
		{ signal },
	);

	return response as BrowserListResponse;
}

export function BrowserApp() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [data, setData] = useState<BrowserListResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [requestVersion, setRequestVersion] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [downloadingPaths, setDownloadingPaths] = useState<Set<string>>(
		new Set(),
	);
	const currentPrefix = searchParams.get("prefix") ?? "";

	useEffect(() => {
		setCurrentPage(1);
	}, [currentPrefix]);

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		setIsLoading(true);
		setError(null);

		void (async () => {
			try {
				const response = await fetchBrowserData(
					currentPrefix,
					controller.signal,
				);
				if (!cancelled) {
					setData(response);
				}
			} catch (fetchError: unknown) {
				if (
					cancelled ||
					controller.signal.aborted ||
					(fetchError instanceof Error &&
						fetchError.name === "AbortError")
				) {
					return;
				}

				setError(
					fetchError instanceof Error
						? fetchError.message
						: "Failed to load bucket contents",
				);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [currentPrefix, requestVersion]);

	function navigateToPrefix(prefix: string) {
		startTransition(() => {
			const nextSearchParams = new URLSearchParams(
				searchParams.toString(),
			);
			if (prefix) {
				nextSearchParams.set("prefix", prefix);
			} else {
				nextSearchParams.delete("prefix");
			}

			const query = nextSearchParams.toString();
			router.push(query ? `${pathname}?${query}` : pathname);
		});
	}

	function handleRefresh() {
		startTransition(() => {
			setRequestVersion((value) => value + 1);
		});
	}

	const handleDownload = async (path: string) => {
		setDownloadingPaths((prev) => new Set(prev).add(path));
		try {
			const { downloadUrl } = await orpcClient.browser.download({
				path,
			});
			window.open(downloadUrl, "_blank");
		} catch (err) {
			console.error("Download failed:", err);
		} finally {
			setDownloadingPaths((prev) => {
				const next = new Set(prev);
				next.delete(path);
				return next;
			});
		}
	};

	const entries = data
		? [
				...data.folders.map((folder) => ({
					type: "folder" as const,
					folder,
				})),
				...data.files.map((file) => ({
					type: "file" as const,
					file,
				})),
			]
		: [];

	const totalItems = entries.length;
	const pageCount = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
	const safePage = Math.min(currentPage, pageCount);
	const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
	const pageEntries = entries.slice(pageStart, pageStart + ITEMS_PER_PAGE);

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	return (
		<main className="bg-background px-4 py-8 md:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="border-b">
						<div className="flex items-start justify-between gap-4">
							<div>
								<CardTitle>Contents</CardTitle>
								<CardDescription>
									Browse folders, inspect metadata, and
									download files directly from S3.
								</CardDescription>
							</div>
							<Button
								variant="outline"
								size="icon"
								onClick={handleRefresh}
								disabled={isPending || isLoading}
							>
								<RefreshCcw className="size-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-6 pt-6">
						<div className="flex flex-wrap items-center gap-2">
							{(
								data?.breadcrumbs ?? [
									{ label: "Root", prefix: "" },
								]
							).map((crumb) => (
								<Button
									key={`${crumb.label}-${crumb.prefix}`}
									variant={
										crumb.prefix ===
										(data?.currentPrefix ?? "")
											? "secondary"
											: "ghost"
									}
									size="sm"
									onClick={() =>
										navigateToPrefix(crumb.prefix)
									}
									disabled={isPending || isLoading}
								>
									{crumb.label}
								</Button>
							))}
						</div>

						{error ? (
							<div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-3 rounded-xl border p-4 text-sm">
								<WarningCircle className="mt-0.5 size-5 shrink-0" />
								<div>
									<p className="font-medium">
										Unable to load bucket contents
									</p>
									<p className="text-destructive/80 mt-1">
										{error}
									</p>
								</div>
							</div>
						) : null}

						<div className="overflow-hidden rounded-xl border">
							<div className="bg-muted/40 text-muted-foreground hidden grid-cols-[minmax(0,1.6fr)_140px_180px_120px] gap-4 border-b px-4 py-3 text-xs font-medium tracking-[0.18em] uppercase md:grid">
								<span>Name</span>
								<span>Size</span>
								<span>Updated</span>
								<span className="text-right">Action</span>
							</div>

							{isLoading ? (
								<div className="space-y-3 p-4">
									{Array.from({ length: 6 }).map(
										(_, index) => (
											<div
												key={index}
												className="bg-muted/50 h-16 animate-pulse rounded-lg"
											/>
										),
									)}
								</div>
							) : null}

							{!isLoading &&
							!error &&
							data &&
							totalItems === 0 ? (
								<div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
									<Folder className="text-muted-foreground size-10" />
									<div>
										<p className="font-medium">
											This folder is empty
										</p>
										<p className="text-muted-foreground text-sm">
											Choose another breadcrumb or upload
											files to this prefix.
										</p>
									</div>
								</div>
							) : null}

							{!isLoading && !error && data && totalItems > 0 ? (
								<div className="divide-y">
									{pageEntries.map((entry) => {
										if (entry.type === "folder") {
											const { folder } = entry;
											return (
												<button
													key={folder.prefix}
													type="button"
													className="hover:bg-muted/40 grid w-full gap-3 px-4 py-4 text-left transition-colors md:grid-cols-[minmax(0,1.6fr)_140px_180px_120px] md:items-center"
													onClick={() =>
														navigateToPrefix(
															folder.prefix,
														)
													}
												>
													<span className="flex min-w-0 items-center gap-3 font-medium">
														<Folder className="text-primary size-5 shrink-0" />
														<span className="truncate">
															{folder.name}
														</span>
													</span>
													<span className="text-muted-foreground text-sm">
														Folder
													</span>
													<span className="text-muted-foreground text-sm">
														{formatUpdatedAt(
															folder.updatedAt,
														)}
													</span>
													<span className="flex justify-start md:justify-end">
														<span className="text-primary inline-flex items-center gap-2 text-sm">
															Open
															<ArrowSquareOut className="size-4" />
														</span>
													</span>
												</button>
											);
										}

										const { file } = entry;
										const isDownloading =
											downloadingPaths.has(file.path);

										return (
											<div
												key={file.path}
												className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.6fr)_140px_180px_120px] md:items-center"
											>
												<div className="flex min-w-0 items-center gap-3">
													<File className="text-muted-foreground size-5 shrink-0" />
													<div className="min-w-0">
														<p className="truncate font-medium">
															{file.name}
														</p>
														<p className="text-muted-foreground truncate text-sm">
															{file.contentType ??
																"Unknown type"}
														</p>
													</div>
												</div>
												<span className="text-muted-foreground text-sm">
													{formatBytes(file.size)}
												</span>
												<span className="text-muted-foreground text-sm">
													{formatUpdatedAt(
														file.updatedAt,
													)}
												</span>
												<span className="flex justify-start md:justify-end">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															handleDownload(
																file.path,
															)
														}
														disabled={isDownloading}
													>
														{isDownloading ? (
															<Loader2 className="size-4 animate-spin" />
														) : (
															<DownloadSimple className="size-4" />
														)}
														{isDownloading
															? "Downloading..."
															: "Download"}
													</Button>
												</span>
											</div>
										);
									})}
								</div>
							) : null}
						</div>

						{!isLoading && !error && totalItems > ITEMS_PER_PAGE ? (
							<Pagination
								totalItems={totalItems}
								itemsPerPage={ITEMS_PER_PAGE}
								currentPage={safePage}
								onChangeCurrentPage={setCurrentPage}
							/>
						) : null}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

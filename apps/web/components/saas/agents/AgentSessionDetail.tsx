"use client";

import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { cn } from "@repo/ui/utils";
import type { ColumnDef } from "@tanstack/react-table";
import {
	BracesIcon,
	ClockIcon,
	DownloadIcon,
	ExternalLinkIcon,
	FileAudioIcon,
	FileVideoIcon,
	LoaderCircleIcon,
	MessageSquareTextIcon,
	RadioIcon,
	VideoIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MetricKpiCard } from "@/components/saas/app/dashboard/MetricKpiCard";
import { PAGE_SIZE } from "@/components/saas/shared/Pagination";
import {
	DataTable,
	DataTableTypeBadge,
} from "@/components/saas/shared/StandardDataTable";
import type { SessionDetail } from "./lib/hooks";
import { AssistantTranscriptThread } from "./transcript/AssistantTranscriptThread";
import { sessionSegmentsToThreadMessages } from "./transcript/mapTranscriptMessages";

function formatDateTime(value: string | Date | null | undefined) {
	if (!value) {
		return "—";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return String(value);
	}
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "medium",
	}).format(date);
}

function formatDuration(ms: number | null | undefined) {
	if (ms == null || ms < 0) {
		return "—";
	}
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${seconds}s`;
}

function isHttpUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

function isAudioUrl(url: string) {
	return /\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(url);
}

function isAudioRecording(job: {
	audioOnly?: boolean | null;
	playableContentType?: string | null;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	playableUrl?: string | null;
}) {
	if (job.audioOnly === true) {
		return true;
	}
	if (job.playableContentType?.startsWith("audio/")) {
		return true;
	}
	const candidates = [
		job.playableUrl,
		job.fileUrl,
		...(job.outputUrls ?? []),
	].filter((url): url is string => Boolean(url));
	return candidates.some(isAudioUrl);
}

function isS3Url(url: string) {
	return /^s3:\/\//i.test(url);
}

function pickPlayableUrl(job: {
	playableUrl?: string | null;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
}) {
	if (job.playableUrl && isHttpUrl(job.playableUrl)) {
		return job.playableUrl;
	}
	const candidates = [job.fileUrl, ...(job.outputUrls ?? [])].filter(
		(url): url is string => Boolean(url),
	);
	return candidates.find(isHttpUrl) ?? null;
}

function formatBytes(bytes: number | null | undefined) {
	if (bytes == null || bytes < 0) {
		return null;
	}
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function filenameFromUrl(url: string) {
	try {
		const withoutQuery = url.split("?")[0]?.split("#")[0] ?? url;
		const parts = withoutQuery.split("/");
		return parts[parts.length - 1] || "recording";
	} catch {
		return "recording";
	}
}

function filenameFromJob(job: {
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	destination?: { filepath?: string } | null;
	livekitEgressId?: string | null;
	id: string;
}) {
	const filepath = job.destination?.filepath;
	if (filepath) {
		const parts = filepath.split("/");
		return parts[parts.length - 1] || filepath;
	}
	const candidate = job.fileUrl ?? job.outputUrls?.[0];
	if (candidate) {
		return filenameFromUrl(candidate);
	}
	return `${job.livekitEgressId ?? job.id}.mp4`;
}

function transcriptStatusLabel(status: string | undefined) {
	switch (status?.toUpperCase()) {
		case "ACTIVE":
		case "QUEUED":
			return "Listening";
		case "FAILED":
			return "Failed";
		case "CANCELLED":
			return "Cancelled";
		default:
			return "Completed";
	}
}

function isLiveTranscriptStatus(status: string | undefined) {
	const value = status?.toUpperCase();
	return value === "ACTIVE" || value === "QUEUED";
}

function formatPayloadPreview(payload: unknown) {
	if (payload == null) {
		return "—";
	}
	if (typeof payload === "string") {
		return payload || "—";
	}
	try {
		const text = JSON.stringify(payload);
		if (!text || text === "{}" || text === "[]") {
			return "—";
		}
		return text.length > 120 ? `${text.slice(0, 117)}…` : text;
	} catch {
		return "—";
	}
}

function formatPayloadJson(payload: unknown): string {
	if (payload == null) {
		return "null";
	}
	if (typeof payload === "string") {
		const trimmed = payload.trim();
		if (!trimmed) {
			return '""';
		}
		try {
			return JSON.stringify(JSON.parse(trimmed), null, 2);
		} catch {
			return payload;
		}
	}
	try {
		return JSON.stringify(payload, null, 2);
	} catch {
		return String(payload);
	}
}

export type SessionEventRow = {
	id: string;
	sequence?: number;
	eventType?: string;
	type?: string;
	actor?: string;
	occurredAt?: string | Date | null;
	createdAt?: string | Date | null;
	payload?: unknown;
};

export type TranscriptSegmentRow = {
	id: string;
	sequence?: number;
	role?: string;
	speakerIdentity?: string | null;
	text?: string;
	startMs?: number | null;
	endMs?: number | null;
};

export type EgressJobRow = {
	id: string;
	status?: string;
	type?: string;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	playableUrl?: string | null;
	playableContentType?: string | null;
	audioOnly?: boolean | null;
	livekitEgressId?: string | null;
	durationMs?: number | null;
	sizeBytes?: number | null;
	errorMessage?: string | null;
	destination?: {
		bucket?: string;
		filepath?: string;
		endpoint?: string | null;
		region?: string;
	} | null;
	metadata?: { audioOnly?: boolean } | null;
};

function TranscriptStatusBadge({ status }: { status?: string }) {
	const live = isLiveTranscriptStatus(status);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
				live
					? "bg-primary/10 text-primary"
					: "bg-muted text-muted-foreground",
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					live
						? "bg-primary animate-pulse"
						: "bg-muted-foreground/60",
				)}
			/>
			{transcriptStatusLabel(status)}
		</span>
	);
}

function TranscriptPanel({
	segments,
	fullText,
}: {
	segments: TranscriptSegmentRow[];
	fullText: string | null;
}) {
	const messages = useMemo(
		() => sessionSegmentsToThreadMessages(segments, fullText),
		[segments, fullText],
	);

	return (
		<AssistantTranscriptThread
			messages={messages}
			className="max-h-[32rem] min-h-[22rem]"
			emptyFallback={
				<div className="flex min-h-[22rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 text-center">
					<MessageSquareTextIcon className="size-8 text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">
						No transcript available yet.
					</p>
				</div>
			}
		/>
	);
}

function EgressMediaPlayer({
	url,
	audioOnly,
	contentType,
}: {
	url: string;
	audioOnly?: boolean;
	contentType?: string | null;
}) {
	const useAudio =
		audioOnly || contentType?.startsWith("audio/") || isAudioUrl(url);

	if (useAudio) {
		return (
			<audio
				controls
				preload="metadata"
				className="w-full rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5"
			>
				<source src={url} type={contentType ?? "audio/mp4"} />
				<track kind="captions" />
			</audio>
		);
	}

	return (
		<video
			controls
			preload="metadata"
			className="aspect-video w-full rounded-xl bg-black object-contain ring-1 ring-black/10"
		>
			<source src={url} type={contentType ?? "video/mp4"} />
			<track kind="captions" />
		</video>
	);
}

function EgressStatusBadge({
	status,
	ready,
}: {
	status: string;
	ready?: boolean;
}) {
	const isComplete = status === "COMPLETE" || Boolean(ready);
	const isFailed = status === "FAILED" || status === "ABORTED";
	const inProgress =
		!ready &&
		(status === "ACTIVE" || status === "ENDING" || status === "STARTING");

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
				isComplete &&
					"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
				isFailed && "bg-destructive/10 text-destructive",
				inProgress && "bg-primary/10 text-primary",
				!isComplete &&
					!isFailed &&
					!inProgress &&
					"bg-muted text-muted-foreground",
			)}
		>
			{inProgress ? (
				<span className="relative flex size-1.5">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
					<span className="relative inline-flex size-1.5 rounded-full bg-primary" />
				</span>
			) : (
				<span
					className={cn(
						"size-1.5 rounded-full",
						isComplete && "bg-emerald-500",
						isFailed && "bg-destructive",
						!isComplete && !isFailed && "bg-muted-foreground/60",
					)}
				/>
			)}
			{ready && status !== "COMPLETE" ? "ready" : status.toLowerCase()}
		</span>
	);
}

function EgressPanel({ jobs }: { jobs: EgressJobRow[] }) {
	if (jobs.length === 0) {
		return (
			<div className="flex min-h-[22rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 text-center">
				<VideoIcon className="size-8 text-muted-foreground/40" />
				<p className="text-sm text-muted-foreground">No recordings.</p>
			</div>
		);
	}

	return (
		<div className="no-scrollbar max-h-[32rem] min-h-[22rem] space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
			{jobs.map((job) => {
				const playableUrl = pickPlayableUrl(job);
				const status = (job.status ?? "unknown").toUpperCase();
				const filename = filenameFromJob(job);
				const sizeLabel = formatBytes(job.sizeBytes);
				const storedPath =
					job.destination?.filepath ||
					(job.fileUrl && isS3Url(job.fileUrl) ? job.fileUrl : null);
				const audioOnly = isAudioRecording(job);
				const inProgress =
					status === "ACTIVE" ||
					status === "ENDING" ||
					status === "STARTING";
				const durationLabel = formatDuration(job.durationMs);
				const FileIcon = audioOnly ? FileAudioIcon : FileVideoIcon;

				return (
					<div
						key={job.id}
						className="overflow-hidden rounded-2xl border border-border/70 bg-linear-to-b from-background to-muted/20 shadow-sm"
					>
						<div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
							<div className="min-w-0 space-y-1.5">
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-sm font-semibold tracking-tight">
										{(job.type ?? "Recording").replace(
											/_/g,
											" ",
										)}
									</p>
									{durationLabel !== "—" ? (
										<span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
											<ClockIcon className="size-3" />
											{durationLabel}
										</span>
									) : null}
								</div>
							</div>
							<EgressStatusBadge
								status={status}
								ready={Boolean(playableUrl)}
							/>
						</div>

						<div className="space-y-3 p-4">
							{playableUrl ? (
								<EgressMediaPlayer
									url={playableUrl}
									audioOnly={audioOnly}
									contentType={job.playableContentType}
								/>
							) : inProgress ? (
								<div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3">
									<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<LoaderCircleIcon className="size-4 animate-spin" />
									</span>
									<div className="min-w-0">
										<p className="text-sm font-medium text-foreground">
											Recording in progress
										</p>
										<p className="text-xs text-muted-foreground">
											Output will appear here when the
											recording finishes.
										</p>
									</div>
								</div>
							) : job.errorMessage ? (
								<div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
									{job.errorMessage}
								</div>
							) : storedPath ? (
								<div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
									<p className="text-sm text-muted-foreground">
										Recording stored; playback unavailable.
									</p>
									<p className="truncate font-mono text-xs text-muted-foreground/80">
										{storedPath}
									</p>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No recording available.
								</p>
							)}

							{(playableUrl || storedPath) && (
								<div className="space-y-2">
									<p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
										Output files
									</p>
									<div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
											<FileIcon className="size-4" />
										</span>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{filename}
											</p>
											<p className="text-xs text-muted-foreground">
												{[
													sizeLabel,
													durationLabel !== "—"
														? durationLabel
														: null,
													inProgress
														? "Recording"
														: null,
												]
													.filter(Boolean)
													.join(" · ") || "Recording"}
											</p>
										</div>
										{playableUrl ? (
											<div className="flex shrink-0 items-center gap-0.5">
												<Button
													asChild
													variant="ghost"
													size="icon"
													className="size-8 rounded-lg"
												>
													<a
														href={playableUrl}
														download={filename}
														aria-label={`Download ${filename}`}
													>
														<DownloadIcon className="size-4" />
													</a>
												</Button>
												<Button
													asChild
													variant="ghost"
													size="icon"
													className="size-8 rounded-lg"
												>
													<a
														href={playableUrl}
														target="_blank"
														rel="noreferrer"
														aria-label={`Open ${filename}`}
													>
														<ExternalLinkIcon className="size-4" />
													</a>
												</Button>
											</div>
										) : null}
									</div>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function SessionEventsPanel({ events }: { events: SessionEventRow[] }) {
	const [selectedEvent, setSelectedEvent] = useState<SessionEventRow | null>(
		null,
	);

	const sortedEvents = useMemo(
		() =>
			[...events].sort((a, b) => {
				const aSeq = a.sequence ?? Number.MAX_SAFE_INTEGER;
				const bSeq = b.sequence ?? Number.MAX_SAFE_INTEGER;
				if (aSeq !== bSeq) {
					return aSeq - bSeq;
				}
				const aTime = new Date(
					a.occurredAt ?? a.createdAt ?? 0,
				).getTime();
				const bTime = new Date(
					b.occurredAt ?? b.createdAt ?? 0,
				).getTime();
				return aTime - bTime;
			}),
		[events],
	);

	const columns = useMemo<ColumnDef<SessionEventRow>[]>(
		() => [
			{
				id: "sequence",
				header: "#",
				size: 56,
				cell: ({ row }) => (
					<span className="tabular-nums text-muted-foreground">
						{row.original.sequence ?? "—"}
					</span>
				),
			},
			{
				id: "type",
				header: "Type",
				cell: ({ row }) => {
					const type =
						row.original.eventType ?? row.original.type ?? "event";
					return (
						<DataTableTypeBadge>
							<span className="max-w-[220px] truncate">
								{type}
							</span>
						</DataTableTypeBadge>
					);
				},
			},
			{
				id: "actor",
				header: "Actor",
				cell: ({ row }) => (
					<span className="capitalize text-muted-foreground">
						{row.original.actor?.toLowerCase() ?? "—"}
					</span>
				),
			},
			{
				id: "occurred",
				header: "Occurred",
				cell: ({ row }) => (
					<span className="whitespace-nowrap text-muted-foreground">
						{formatDateTime(
							row.original.occurredAt ?? row.original.createdAt,
						)}
					</span>
				),
			},
			{
				id: "details",
				header: "Details",
				cell: ({ row }) => (
					<span className="block max-w-[320px] truncate font-mono text-xs text-muted-foreground">
						{formatPayloadPreview(row.original.payload)}
					</span>
				),
			},
			{
				id: "actions",
				header: "",
				size: 48,
				enableSorting: false,
				cell: ({ row }) => (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label="View event payload"
						onClick={() => setSelectedEvent(row.original)}
					>
						<BracesIcon className="size-4 text-muted-foreground" />
					</Button>
				),
			},
		],
		[],
	);

	const selectedType =
		selectedEvent?.eventType ?? selectedEvent?.type ?? "event";

	return (
		<>
			<DataTable
				columns={columns}
				data={sortedEvents}
				framed={false}
				pageSize={PAGE_SIZE}
				getRowId={(row) => row.id}
				emptyMessage="No events."
			/>
			<Dialog
				open={selectedEvent != null}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedEvent(null);
					}
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle className="truncate">
							{selectedType}
						</DialogTitle>
					</DialogHeader>
					<pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
						{formatPayloadJson(selectedEvent?.payload)}
					</pre>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function AgentSessionDetail({ session }: { session: SessionDetail }) {
	const egressJobs = session.egressJobs ?? [];
	const transcriptSegments = session.transcript?.segments ?? [];
	const transcriptText =
		session.transcript?.fullText ?? session.transcript?.text ?? null;

	return (
		<div className="mt-4 space-y-4">
			<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
				<MetricKpiCard
					compact
					title="Channel"
					value={session.channel ?? "WEB"}
					icon={RadioIcon}
					valueClassName="text-base"
				/>
				<MetricKpiCard
					compact
					title="Started"
					value={formatDateTime(session.startedAt)}
					icon={ClockIcon}
					valueClassName="text-base"
				/>
				<MetricKpiCard
					compact
					title="Ended"
					value={formatDateTime(session.endedAt)}
					icon={ClockIcon}
					valueClassName="text-base"
				/>
				<MetricKpiCard
					compact
					title="Duration"
					value={formatDuration(session.durationMs)}
					icon={ClockIcon}
					valueClassName="text-base"
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="flex min-h-0 flex-col overflow-hidden shadow-xs">
					<CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 pb-3">
						<div className="flex items-center gap-2">
							<span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								<MessageSquareTextIcon className="size-4" />
							</span>
							<CardTitle className="text-base font-bold leading-none">
								Transcript
							</CardTitle>
						</div>
						<div className="flex items-center gap-2">
							{transcriptSegments.length > 0 ? (
								<span className="text-xs text-muted-foreground">
									{transcriptSegments.length}{" "}
									{transcriptSegments.length === 1
										? "turn"
										: "turns"}
								</span>
							) : null}
							<TranscriptStatusBadge status={session.status} />
						</div>
					</CardHeader>
					<CardContent className="p-4">
						<TranscriptPanel
							segments={transcriptSegments}
							fullText={transcriptText}
						/>
					</CardContent>
				</Card>

				<Card className="flex min-h-0 flex-col overflow-hidden shadow-xs">
					<CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 pb-3">
						<div className="flex items-center gap-2">
							<span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								<VideoIcon className="size-4" />
							</span>
							<CardTitle className="text-base font-bold leading-none">
								Recording
							</CardTitle>
						</div>
						{egressJobs.length > 0 ? (
							<span className="text-xs text-muted-foreground">
								{egressJobs.length}{" "}
								{egressJobs.length === 1 ? "job" : "jobs"}
							</span>
						) : null}
					</CardHeader>
					<CardContent className="p-4">
						<EgressPanel jobs={egressJobs} />
					</CardContent>
				</Card>
			</div>

			{(session.collectedFields?.length ?? 0) > 0 ? (
				<Card className="shadow-xs">
					<CardHeader>
						<CardTitle className="text-base font-bold leading-none">
							Collected fields
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2 sm:grid-cols-2">
						{(session.collectedFields ?? []).map((field) => (
							<div
								key={field.id}
								className="rounded-xl border border-border/70 px-3 py-2 text-sm shadow-xs"
							>
								<div className="text-xs text-muted-foreground">
									{field.label || field.key}
								</div>
								<div className="font-medium">
									{String(field.value ?? "—")}
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{session.campaignSession ? (
				<Card className="shadow-xs">
					<CardHeader>
						<CardTitle className="text-base font-bold leading-none">
							Campaign outcome
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<div>
							Status: {session.campaignSession.status ?? "—"}
						</div>
						<div>
							Outcome: {session.campaignSession.outcome ?? "—"}
						</div>
						{session.campaignSession.summary ? (
							<p className="text-muted-foreground">
								{session.campaignSession.summary}
							</p>
						) : null}
					</CardContent>
				</Card>
			) : null}

			{(session.callbackSchedules?.length ?? 0) > 0 ? (
				<Card className="shadow-xs">
					<CardHeader>
						<CardTitle className="text-base font-bold leading-none">
							Callbacks
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{(session.callbackSchedules ?? []).map((cb) => (
							<div
								key={cb.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
							>
								<span>
									{cb.phoneE164} · {cb.source}
								</span>
								<span className="text-muted-foreground">
									{formatDateTime(cb.scheduledAt)} ·{" "}
									{cb.status}
								</span>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{session.errorMessage ? (
				<Card className="border-destructive/40 shadow-xs">
					<CardHeader>
						<CardTitle className="text-base font-bold leading-none text-destructive">
							Error
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm">
						{session.errorMessage}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

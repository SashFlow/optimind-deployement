"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/accordion";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import { useEffect, useMemo, useState } from "react";
import {
	PAGE_SIZE,
	Pagination,
	useClientPagination,
} from "@/components/saas/shared/Pagination";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";
import { useSessionDetailQuery } from "./lib/hooks";

function formatDateTime(value: string | Date | null | undefined) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "medium",
	}).format(date);
}

function formatDuration(ms: number | null | undefined) {
	if (ms == null || ms < 0) return "—";
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

function formatOffsetMs(ms: number | null | undefined) {
	if (ms == null || ms < 0) return null;
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isHttpUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

function isAudioUrl(url: string) {
	return /\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(url);
}

function pickPlayableUrl(job: {
	fileUrl?: string | null;
	outputUrls?: string[] | null;
}) {
	const candidates = [
		job.fileUrl,
		...(job.outputUrls ?? []),
	].filter((url): url is string => Boolean(url));
	return candidates.find(isHttpUrl) ?? null;
}

function roleLabel(role: string | undefined) {
	switch (role?.toUpperCase()) {
		case "USER":
		case "CALLER":
			return "User";
		case "AGENT":
		case "ASSISTANT":
			return "Agent";
		case "SYSTEM":
			return "System";
		default:
			return role ?? "Speaker";
	}
}

function formatPayloadPreview(payload: unknown) {
	if (payload == null) return "—";
	if (typeof payload === "string") return payload || "—";
	try {
		const text = JSON.stringify(payload);
		if (!text || text === "{}" || text === "[]") return "—";
		return text.length > 120 ? `${text.slice(0, 117)}…` : text;
	} catch {
		return "—";
	}
}

function formatPayloadJson(payload: unknown): string {
	if (payload == null) return "null";
	if (typeof payload === "string") {
		const trimmed = payload.trim();
		if (!trimmed) return '""';
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

type SessionEventRow = {
	id: string;
	sequence?: number;
	eventType?: string;
	type?: string;
	actor?: string;
	occurredAt?: string | Date | null;
	createdAt?: string | Date | null;
	payload?: unknown;
};

type TranscriptSegmentRow = {
	id: string;
	sequence?: number;
	role?: string;
	speakerIdentity?: string | null;
	text?: string;
	startMs?: number | null;
	endMs?: number | null;
};

type EgressJobRow = {
	id: string;
	status?: string;
	type?: string;
	fileUrl?: string | null;
	outputUrls?: string[] | null;
	livekitEgressId?: string | null;
	durationMs?: number | null;
	errorMessage?: string | null;
};

function TranscriptPanel({
	segments,
	fullText,
}: {
	segments: TranscriptSegmentRow[];
	fullText: string | null;
}) {
	if (segments.length > 0) {
		return (
			<div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
				{segments.map((segment) => {
					const role = segment.role?.toUpperCase() ?? "";
					const isUser = role === "USER" || role === "CALLER";
					const offset = formatOffsetMs(segment.startMs);

					return (
						<div
							key={segment.id}
							className={cn(
								"rounded-2xl px-3 py-2.5 text-sm",
								isUser
									? "ml-4 bg-primary/10"
									: "mr-4 bg-muted/60",
							)}
						>
							<div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
								<span>
									{roleLabel(segment.role)}
									{segment.speakerIdentity
										? ` · ${segment.speakerIdentity}`
										: null}
								</span>
								{offset ? (
									<span className="normal-case tracking-normal tabular-nums">
										{offset}
									</span>
								) : null}
							</div>
							<p className="whitespace-pre-wrap text-pretty leading-relaxed">
								{segment.text?.trim() || "—"}
							</p>
						</div>
					);
				})}
			</div>
		);
	}

	if (fullText?.trim()) {
		return (
			<pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">
				{fullText}
			</pre>
		);
	}

	return (
		<p className="text-sm text-muted-foreground">No transcript available.</p>
	);
}

function EgressMediaPlayer({ url }: { url: string }) {
	if (isAudioUrl(url)) {
		return (
			<audio
				controls
				preload="metadata"
				src={url}
				className="w-full"
			>
				<track kind="captions" />
			</audio>
		);
	}

	return (
		<video
			controls
			preload="metadata"
			src={url}
			className="aspect-video w-full rounded-xl bg-black object-contain"
		>
			<track kind="captions" />
		</video>
	);
}

function EgressPanel({ jobs }: { jobs: EgressJobRow[] }) {
	if (jobs.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">No egress jobs.</p>
		);
	}

	return (
		<div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
			{jobs.map((job) => {
				const playableUrl = pickPlayableUrl(job);
				const status = job.status ?? "unknown";

				return (
					<div
						key={job.id}
						className="space-y-3 rounded-2xl border bg-background p-3"
					>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div className="min-w-0 space-y-1">
								<p className="truncate font-mono text-xs text-muted-foreground">
									{job.livekitEgressId ?? job.id}
								</p>
								<p className="text-sm font-medium">
									{job.type ?? "Recording"}
									<span className="font-normal text-muted-foreground">
										{" "}
										· {formatDuration(job.durationMs)}
									</span>
								</p>
							</div>
							<Badge
								variant={
									status === "COMPLETE"
										? "default"
										: status === "FAILED" ||
												status === "ABORTED"
											? "destructive"
											: "secondary"
								}
								className="capitalize"
							>
								{status.toLowerCase()}
							</Badge>
						</div>

						{playableUrl ? (
							<EgressMediaPlayer url={playableUrl} />
						) : job.fileUrl ? (
							<a
								href={job.fileUrl}
								target="_blank"
								rel="noreferrer"
								className="block truncate text-xs underline-offset-2 hover:underline"
							>
								{job.fileUrl}
							</a>
						) : (
							<p className="text-sm text-muted-foreground">
								{job.errorMessage ?? "No recording available."}
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
}

function SessionEventsPanel({ events }: { events: SessionEventRow[] }) {
	const sortedEvents = useMemo(
		() =>
			[...events].sort((a, b) => {
				const aSeq = a.sequence ?? Number.MAX_SAFE_INTEGER;
				const bSeq = b.sequence ?? Number.MAX_SAFE_INTEGER;
				if (aSeq !== bSeq) return aSeq - bSeq;
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

	const {
		currentPage,
		setCurrentPage,
		pageItems,
		totalItems,
		itemsPerPage,
	} = useClientPagination(sortedEvents, PAGE_SIZE);

	const [openItem, setOpenItem] = useState<string>("");

	useEffect(() => {
		setOpenItem("");
	}, [currentPage]);

	if (events.length === 0) {
		return <p className="text-sm text-muted-foreground">No events.</p>;
	}

	return (
		<div className="overflow-hidden rounded-xl border bg-white">
			<div className="hidden grid-cols-[48px_minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.4fr)_24px] gap-3 border-b bg-white px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
				<span>#</span>
				<span>Type</span>
				<span>Actor</span>
				<span>Occurred</span>
				<span>Details</span>
				<span />
			</div>

			<Accordion
				type="single"
				collapsible
				value={openItem}
				onValueChange={setOpenItem}
				className="bg-white"
			>
				{pageItems.map((event) => {
					const type = event.eventType ?? event.type ?? "event";
					const actor = event.actor?.toLowerCase() ?? "—";
					const occurred = formatDateTime(
						event.occurredAt ?? event.createdAt,
					);
					const preview = formatPayloadPreview(event.payload);

					return (
						<AccordionItem
							key={event.id}
							value={event.id}
							className="border-b border-border/70 px-4 last:border-b-0"
						>
							<AccordionTrigger className="py-3 hover:no-underline">
								<div className="grid w-full grid-cols-1 gap-1 text-left md:grid-cols-[48px_minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-3">
									<span className="text-xs tabular-nums text-muted-foreground md:text-sm">
										{event.sequence ?? "—"}
									</span>
									<span className="truncate text-sm font-medium">
										{type}
									</span>
									<span className="capitalize text-sm text-muted-foreground">
										{actor}
									</span>
									<span className="whitespace-nowrap text-xs text-muted-foreground">
										{occurred}
									</span>
									<span className="truncate font-mono text-xs text-muted-foreground">
										{preview}
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="pb-4">
								<pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
									{formatPayloadJson(event.payload)}
								</pre>
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>

			{totalItems > itemsPerPage ? (
				<div className="border-t bg-white px-2 py-2">
					<Pagination
						currentPage={currentPage}
						totalItems={totalItems}
						itemsPerPage={itemsPerPage}
						onChangeCurrentPage={setCurrentPage}
					/>
				</div>
			) : null}
		</div>
	);
}

export function AgentSessionDetail({
	sessionId,
}: {
	agentId: string;
	sessionId: string;
	organizationId?: string;
}) {
	const sessionQuery = useSessionDetailQuery(sessionId);

	if (sessionQuery.isLoading) {
		return <PageSectionSkeleton variant="detail" />;
	}

	if (sessionQuery.isError || !sessionQuery.data?.session) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load session.
			</p>
		);
	}

	const session = sessionQuery.data.session as {
		id: string;
		status: string;
		channel?: string;
		livekitRoomName: string;
		startedAt?: string | Date | null;
		endedAt?: string | Date | null;
		durationMs?: number | null;
		errorMessage?: string | null;
		events?: SessionEventRow[];
		transcript?: {
			text?: string | null;
			fullText?: string | null;
			segments?: TranscriptSegmentRow[];
		} | null;
		egressJobs?: EgressJobRow[];
	};

	const events = session.events ?? [];
	const egressJobs = session.egressJobs ?? [];
	const transcriptSegments = session.transcript?.segments ?? [];
	const transcriptText =
		session.transcript?.fullText ?? session.transcript?.text ?? null;

	const tabTriggerClass = cn(
		"h-9 flex-none gap-2 rounded-full px-4 py-2 text-muted-foreground shadow-none transition-colors hover:text-foreground",
		"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none",
		"data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground",
	);

	return (
		<section className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden px-4 py-6 md:px-6">
			<Tabs defaultValue="overview" className="min-h-0 flex-1">
				<TabsList className="h-auto w-fit gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground shadow-sm ring-1 ring-black/5">
					<TabsTrigger value="overview" className={tabTriggerClass}>
						Overview
					</TabsTrigger>
					<TabsTrigger value="events" className={tabTriggerClass}>
						Events
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Channel
								</CardTitle>
							</CardHeader>
							<CardContent>
								{session.channel ?? "WEB"}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Started
								</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDateTime(session.startedAt)}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">Ended</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDateTime(session.endedAt)}
							</CardContent>
						</Card>
						<Card className="rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Duration
								</CardTitle>
							</CardHeader>
							<CardContent>
								{formatDuration(session.durationMs)}
							</CardContent>
						</Card>
					</div>

					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle className="text-sm">Room</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-mono text-xs">
								{session.livekitRoomName}
							</p>
						</CardContent>
					</Card>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card className="flex min-h-0 flex-col rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">
									Transcript
								</CardTitle>
							</CardHeader>
							<CardContent>
								<TranscriptPanel
									segments={transcriptSegments}
									fullText={transcriptText}
								/>
							</CardContent>
						</Card>

						<Card className="flex min-h-0 flex-col rounded-3xl">
							<CardHeader>
								<CardTitle className="text-sm">Egress</CardTitle>
							</CardHeader>
							<CardContent>
								<EgressPanel jobs={egressJobs} />
							</CardContent>
						</Card>
					</div>

					{session.errorMessage ? (
						<Card className="rounded-3xl border-destructive/40">
							<CardHeader>
								<CardTitle className="text-sm text-destructive">
									Error
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm">
								{session.errorMessage}
							</CardContent>
						</Card>
					) : null}
				</TabsContent>

				<TabsContent value="events" className="mt-4">
					<SessionEventsPanel events={events} />
				</TabsContent>
			</Tabs>
		</section>
	);
}

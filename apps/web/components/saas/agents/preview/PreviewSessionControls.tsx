"use client";

import {
	BarVisualizer,
	RoomAudioRenderer,
	TrackToggle,
	useConnectionState,
	useLocalParticipant,
	useParticipants,
	useRoomContext,
	useTracks,
	useVoiceAssistant,
	VideoTrack,
	type AgentState,
	type TrackReference,
} from "@livekit/components-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import {
	FileIcon,
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	VideoIcon,
	VideoOffIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Agent } from "@/services/api/types";
import {
	usePreviewRoomData,
	type PreviewFileItem,
	type PreviewRpcCard,
	type PreviewTextItem,
} from "./usePreviewRoomData";

function isUserParticipant(identity: string) {
	return (
		identity.startsWith("user-") ||
		identity.startsWith("user_") ||
		identity.startsWith("trial-user-") ||
		identity.startsWith("voice_assistant_user_")
	);
}

function useLocalTrackRef(source: Track.Source) {
	const { localParticipant } = useLocalParticipant();
	const publication = localParticipant.getTrackPublication(source);
	return useMemo<TrackReference | undefined>(() => {
		if (!publication) return undefined;
		return {
			source,
			participant: localParticipant,
			publication,
		};
	}, [localParticipant, publication, source]);
}

function AudioBars({
	trackRef,
	state,
	barCount = 12,
	className,
}: {
	trackRef?: TrackReference;
	state?: AgentState;
	barCount?: number;
	className?: string;
}) {
	return (
		<BarVisualizer
			trackRef={trackRef}
			state={state}
			barCount={barCount}
			options={{ minHeight: 12, maxHeight: 100 }}
			className={cn(
				"flex h-16 items-end justify-center gap-1",
				className,
			)}
		>
			<span
				className={cn(
					"min-h-1 w-1.5 rounded-full bg-muted-foreground/30 transition-colors",
					"data-[lk-highlighted=true]:bg-primary",
				)}
			/>
		</BarVisualizer>
	);
}

function MessageList({
	messages,
	localIdentity,
}: {
	messages: PreviewTextItem[];
	localIdentity: string;
}) {
	if (messages.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				Transcriptions and agent text will appear here.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{messages.map((message) => {
				const isLocal = message.from === localIdentity;
				return (
					<div
						key={message.id}
						className={cn(
							"rounded-lg px-3 py-2 text-sm",
							isLocal
								? "ml-6 bg-primary/10"
								: "mr-6 bg-muted",
						)}
					>
						<div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
							<span>
								{isLocal
									? "You"
									: message.topic === "lk.transcription"
										? "Transcript"
										: "Agent"}
							</span>
							<span className="normal-case tracking-normal">
								{message.topic}
							</span>
						</div>
						<p className="whitespace-pre-wrap text-pretty">
							{message.text}
						</p>
					</div>
				);
			})}
		</div>
	);
}

function FileList({ files }: { files: PreviewFileItem[] }) {
	if (files.length === 0) return null;

	return (
		<div className="space-y-2">
			{files.map((file) => {
				const isImage = file.mimeType?.startsWith("image/");
				return (
					<div
						key={file.id}
						className="overflow-hidden rounded-lg border bg-background"
					>
						{isImage ? (
							// Object URL from LiveKit byte stream; next/image is not suitable.
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={file.url}
								alt={file.name}
								className="max-h-48 w-full object-contain bg-muted"
							/>
						) : null}
						<div className="flex items-center gap-2 px-3 py-2 text-xs">
							<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
							<a
								href={file.url}
								download={file.name}
								className="min-w-0 truncate font-medium underline-offset-2 hover:underline"
							>
								{file.name}
							</a>
							<span className="ml-auto shrink-0 text-muted-foreground">
								{file.topic}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function RpcCardList({ cards }: { cards: PreviewRpcCard[] }) {
	if (cards.length === 0) return null;

	return (
		<div className="space-y-2">
			{cards.map((card) => (
				<div
					key={`${card.method}-${card.id}`}
					className="rounded-lg border bg-background p-3"
				>
					<div className="flex items-start justify-between gap-2">
						<div>
							<p className="text-sm font-medium">{card.title}</p>
							{card.subtitle ? (
								<p className="mt-0.5 text-xs text-muted-foreground">
									{card.subtitle}
								</p>
							) : null}
						</div>
						<span
							className={cn(
								"rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
								card.status === "success" &&
									"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
								card.status === "warning" &&
									"bg-amber-500/10 text-amber-700 dark:text-amber-400",
								(!card.status || card.status === "info") &&
									"bg-muted text-muted-foreground",
							)}
						>
							{card.method.replace(/^client\./, "")}
						</span>
					</div>
					{card.fields.length > 0 ? (
						<dl className="mt-3 space-y-1.5">
							{card.fields.map((field) => (
								<div
									key={`${card.id}-${field.label}`}
									className="grid grid-cols-[auto_1fr] gap-x-3 text-xs"
								>
									<dt className="text-muted-foreground">
										{field.label}
									</dt>
									<dd className="text-right font-medium">
										{field.value}
									</dd>
								</div>
							))}
						</dl>
					) : null}
				</div>
			))}
		</div>
	);
}

export function PreviewSessionControls({
	agent,
	avatarEnabled,
	avatarPreviewUrl,
	onEnd,
}: {
	agent: Agent;
	avatarEnabled: boolean;
	avatarPreviewUrl?: string | null;
	onEnd: () => void;
}) {
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const participants = useParticipants();
	const { state, audioTrack, videoTrack } = useVoiceAssistant();
	const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
	const micTrackRef = useLocalTrackRef(Track.Source.Microphone);
	const cameraTrackRef = useLocalTrackRef(Track.Source.Camera);
	const [screenShareTrack] = useTracks([Track.Source.ScreenShare]);
	const { messages, files, rpcCards } = usePreviewRoomData(
		agent.name,
		agent.id,
	);

	const isConnected = connectionState === ConnectionState.Connected;
	const localIdentity = room.localParticipant?.identity ?? "";
	const hasAgent = participants.some(
		(p) => p.identity !== localIdentity && !isUserParticipant(p.identity),
	);
	const [agentWaitTimedOut, setAgentWaitTimedOut] = useState(false);
	const shouldWaitForAgent = isConnected && !hasAgent;
	const hasAvatarVideo = Boolean(videoTrack);
	const showAvatarFallback =
		avatarEnabled && !hasAvatarVideo && Boolean(avatarPreviewUrl);
	const hasLocalCamera =
		Boolean(cameraTrackRef) &&
		isCameraEnabled &&
		!cameraTrackRef?.publication.isMuted;
	const hasScreenShare =
		Boolean(screenShareTrack) && !screenShareTrack?.publication.isMuted;

	if (!shouldWaitForAgent && agentWaitTimedOut) {
		setAgentWaitTimedOut(false);
	}

	useEffect(() => {
		if (!shouldWaitForAgent) return;
		const timer = window.setTimeout(
			() => setAgentWaitTimedOut(true),
			15_000,
		);
		return () => window.clearTimeout(timer);
	}, [shouldWaitForAgent]);

	useEffect(() => {
		function handleDisconnected() {
			toast.error("Preview session disconnected");
		}
		function handleMediaDeviceError(error: Error) {
			toast.error(error.message || "Microphone access failed");
		}
		room.on(RoomEvent.Disconnected, handleDisconnected);
		room.on(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		return () => {
			room.off(RoomEvent.Disconnected, handleDisconnected);
			room.off(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		};
	}, [room]);

	const statusLabel = (() => {
		if (!isConnected) return "Connecting…";
		if (hasAgent) {
			if (state === "listening") return `Listening · ${agent.name}`;
			if (state === "thinking") return `Thinking · ${agent.name}`;
			if (state === "speaking") return `Speaking · ${agent.name}`;
			return `Live with ${agent.name}`;
		}
		if (agentWaitTimedOut) {
			return "Waiting for agent — ensure the worker is running";
		}
		return "Waiting for agent…";
	})();

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] md:p-4">
				<div className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
					<div className="flex min-h-0 flex-1 items-center justify-center p-4">
						{hasAvatarVideo ? (
							<div className="relative aspect-[3/4] h-full max-h-[min(560px,70dvh)] w-auto max-w-full overflow-hidden rounded-xl bg-black shadow-sm">
								<VideoTrack
									trackRef={videoTrack}
									className="size-full object-cover"
								/>
							</div>
						) : showAvatarFallback ? (
							<div className="relative aspect-[3/4] h-full max-h-[min(420px,60dvh)] w-auto max-w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
								{/* Dynamic avatar URL from config; next/image domains vary. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={avatarPreviewUrl ?? undefined}
									alt="Avatar preview"
									className="size-full object-cover opacity-80"
								/>
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
									<p className="text-xs text-white/90">
										{statusLabel}
									</p>
								</div>
							</div>
						) : (
							<div className="flex w-full max-w-md flex-col items-center gap-4">
								<div className="flex size-40 items-center justify-center rounded-full border bg-background shadow-sm sm:size-52">
									<AudioBars
										trackRef={audioTrack}
										state={hasAgent ? state : "connecting"}
										barCount={16}
										className="h-24 w-28 sm:h-28 sm:w-36"
									/>
								</div>
								<p className="text-center text-sm text-muted-foreground">
									{statusLabel}
								</p>
							</div>
						)}
					</div>

					{(hasLocalCamera || hasScreenShare) && (
						<div className="pointer-events-none absolute right-3 bottom-20 z-10 sm:right-4 sm:bottom-24">
							<div className="pointer-events-auto overflow-hidden rounded-lg border bg-background shadow-md">
								<VideoTrack
									trackRef={
										hasLocalCamera
											? cameraTrackRef
											: screenShareTrack
									}
									className="aspect-square size-24 object-cover sm:size-28"
								/>
							</div>
						</div>
					)}

					<div className="flex items-center justify-center gap-2 border-t bg-background/80 px-3 py-3 backdrop-blur">
						<div className="flex items-center gap-2 rounded-full border bg-card px-2 py-1.5">
							<TrackToggle
								source={Track.Source.Microphone}
								showIcon={false}
								className={cn(
									"inline-flex size-9 items-center justify-center rounded-full border transition-colors",
									isMicrophoneEnabled
										? "border-transparent bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
								)}
							>
								{isMicrophoneEnabled ? (
									<MicIcon className="size-4" />
								) : (
									<MicOffIcon className="size-4" />
								)}
							</TrackToggle>
							<AudioBars
								trackRef={micTrackRef}
								barCount={7}
								className="h-8 w-16"
							/>
						</div>

						<TrackToggle
							source={Track.Source.Camera}
							showIcon={false}
							className={cn(
								"inline-flex size-9 items-center justify-center rounded-full border transition-colors",
								isCameraEnabled
									? "border-transparent bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							)}
						>
							{isCameraEnabled ? (
								<VideoIcon className="size-4" />
							) : (
								<VideoOffIcon className="size-4" />
							)}
						</TrackToggle>

						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="End preview session"
							className="size-9 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
							onClick={() => {
								void room.disconnect();
								onEnd();
							}}
						>
							<PhoneOffIcon className="size-4" />
						</Button>
					</div>
				</div>

				<div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-3">
					<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
						<section className="space-y-2">
							<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Conversation
							</h3>
							<MessageList
								messages={messages}
								localIdentity={localIdentity}
							/>
						</section>
						{files.length > 0 ? (
							<section className="space-y-2">
								<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Files
								</h3>
								<FileList files={files} />
							</section>
						) : null}
						{rpcCards.length > 0 ? (
							<section className="space-y-2">
								<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									RPC
								</h3>
								<RpcCardList cards={rpcCards} />
							</section>
						) : null}
					</div>
				</div>
			</div>
			<RoomAudioRenderer />
		</div>
	);
}

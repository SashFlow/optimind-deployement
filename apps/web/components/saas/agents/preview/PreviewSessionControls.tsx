"use client";

import {
	RoomAudioRenderer,
	type TrackReference,
	TrackToggle,
	useConnectionState,
	useLocalParticipant,
	useParticipants,
	useRoomContext,
	useTracks,
	useVoiceAssistant,
	VideoTrack,
} from "@livekit/components-react";
import { type VoiceOrbState } from "@repo/ui/assistant-ui";
import { Button } from "@repo/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { cn } from "@repo/ui/utils";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import {
	ArrowLeftRightIcon,
	MessageSquareIcon,
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	VideoIcon,
	VideoOffIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Agent } from "@/services/api/types";
import FileList from "./FileList";
import MainStage from "./MainStage";
import MessageList from "./MessageList";
import PipStage from "./PipStage";
import RpcCardList from "./RpcCardList";
import SessionVoiceOrb from "./SessionVoiceOrb";
import SpatialRealAvatarStage from "./SpatialRealAvatarStage";
import { usePreviewRoomData } from "./usePreviewRoomData";

function isUserParticipant(identity: string) {
	return (
		identity.startsWith("user-") ||
		identity.startsWith("user_") ||
		identity.startsWith("trial-user-") ||
		identity.startsWith("voice_assistant_user_")
	);
}

function mapAgentStateToOrb(
	agentState: ReturnType<typeof useVoiceAssistant>["state"],
	hasAgent: boolean,
): VoiceOrbState {
	if (!hasAgent) {
		return "connecting";
	}
	switch (agentState) {
		case "speaking":
			return "speaking";
		case "listening":
			return "listening";
		case "thinking":
			return "connecting";
		case "connecting":
		case "initializing":
			return "connecting";
		default:
			return "idle";
	}
}

function useLocalTrackRef(source: Track.Source) {
	const tracks = useTracks([source], { onlySubscribed: false });
	const { localParticipant } = useLocalParticipant();

	return useMemo<TrackReference | undefined>(() => {
		return tracks.find(
			(track) => track.participant.identity === localParticipant.identity,
		);
	}, [localParticipant.identity, tracks]);
}

const VIDEO_FILL_CLASS = "size-full object-cover";
const PORTRAIT_STAGE_CLASS = "aspect-video w-full max-h-[700px] max-w-5xl";
const LANDSCAPE_STAGE_CLASS = "aspect-video w-full max-h-[420px] max-w-3xl";

export function PreviewSessionControls({
	agent,
	avatarEnabled,
	avatarPreviewUrl,
	avatarType = "anam",
	avatarId,
	onEnd,
}: {
	agent: Agent;
	avatarEnabled: boolean;
	avatarPreviewUrl?: string | null;
	avatarType?: "anam" | "spatialreal";
	/** SpatialReal avatar id; falls back to NEXT_PUBLIC_SPATIALREAL_AVATAR_ID. */
	avatarId?: string | null;
	onEnd: () => void;
}) {
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const participants = useParticipants();
	const { state, audioTrack, videoTrack } = useVoiceAssistant();
	const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
	const cameraTrackRef = useLocalTrackRef(Track.Source.Camera);
	const microphoneTrackRef = useLocalTrackRef(Track.Source.Microphone);
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
	const [chatOpen, setChatOpen] = useState(false);
	const [avatarOnMain, setAvatarOnMain] = useState(true);
	const isEndingRef = useRef(false);
	const didConnectRef = useRef(false);
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;
	const shouldWaitForAgent = isConnected && !hasAgent;
	// SpatialReal renders the avatar client-side from an animation data track,
	// so there is no avatar video track to show.
	const isSpatialReal = avatarEnabled && avatarType === "spatialreal";
	const hasAvatarVideo = !isSpatialReal && Boolean(videoTrack);
	const showAvatarFallback =
		avatarEnabled &&
		!isSpatialReal &&
		!hasAvatarVideo &&
		Boolean(avatarPreviewUrl);
	const showAvatarWaiting =
		avatarEnabled && !isSpatialReal && !hasAvatarVideo && !avatarPreviewUrl;
	const hasLocalCamera =
		Boolean(cameraTrackRef) &&
		isCameraEnabled &&
		!cameraTrackRef?.publication.isMuted;
	const hasScreenShare =
		Boolean(screenShareTrack) && !screenShareTrack?.publication.isMuted;
	const localVideoTrack = hasLocalCamera
		? cameraTrackRef
		: hasScreenShare
			? screenShareTrack
			: undefined;
	const hasLocalVideo = Boolean(localVideoTrack);
	const hasAvatarStage =
		isSpatialReal ||
		hasAvatarVideo ||
		showAvatarFallback ||
		showAvatarWaiting;
	// The SpatialReal canvas must stay mounted, so it always stays on main.
	const canSwapVideos =
		!isSpatialReal &&
		(hasAvatarVideo || showAvatarFallback) &&
		hasLocalVideo;
	const hasChatContent =
		messages.length > 0 || files.length > 0 || rpcCards.length > 0;

	if (!shouldWaitForAgent && agentWaitTimedOut) {
		setAgentWaitTimedOut(false);
	}

	useEffect(() => {
		if (!shouldWaitForAgent) {
			return;
		}
		const timer = window.setTimeout(
			() => setAgentWaitTimedOut(true),
			15_000,
		);
		return () => window.clearTimeout(timer);
	}, [shouldWaitForAgent]);

	useEffect(() => {
		if (isConnected) {
			didConnectRef.current = true;
		}
	}, [isConnected]);

	useEffect(() => {
		function handleDisconnected() {
			if (isEndingRef.current) {
				return;
			}
			toast.error(
				didConnectRef.current
					? "Preview session disconnected"
					: "Failed to connect to session",
			);
			onEndRef.current();
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

	useEffect(() => {
		if (!canSwapVideos && !avatarOnMain) {
			setAvatarOnMain(true);
		}
	}, [avatarOnMain, canSwapVideos]);

	const statusLabel = (() => {
		if (!isConnected) {
			return "Connecting…";
		}
		if (hasAgent) {
			if (state === "listening") {
				return `Listening · ${agent.name}`;
			}
			if (state === "thinking") {
				return `Thinking · ${agent.name}`;
			}
			if (state === "speaking") {
				return `Speaking · ${agent.name}`;
			}
			return `Live with ${agent.name}`;
		}
		if (agentWaitTimedOut) {
			return "Waiting for agent — ensure the worker is running";
		}
		return "Waiting for agent…";
	})();

	const avatarVideo = isSpatialReal ? (
		<SpatialRealAvatarStage room={room} avatarId={avatarId} />
	) : hasAvatarVideo ? (
		<VideoTrack trackRef={videoTrack} className={VIDEO_FILL_CLASS} />
	) : showAvatarFallback ? (
		<>
			{/* Dynamic avatar URL from config; next/image domains vary. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			{/* biome-ignore lint/performance/noImgElement: dynamic avatar URLs */}
			<img
				src={avatarPreviewUrl ?? undefined}
				alt="Avatar preview"
				className={cn(VIDEO_FILL_CLASS, "opacity-90")}
			/>
		</>
	) : showAvatarWaiting ? (
		<div className="flex size-full flex-col items-center justify-center gap-3 bg-black px-4 text-center">
			<p className="text-sm text-white/90">Waiting for avatar video…</p>
			<p className="text-xs text-white/60">{statusLabel}</p>
		</div>
	) : null;

	const avatarMainStage = avatarVideo ? (
		<>
			{avatarVideo}
			{showAvatarFallback ||
			((hasAvatarVideo || isSpatialReal) && !hasAgent) ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 to-transparent p-3">
					<p className="text-xs text-white/90">{statusLabel}</p>
				</div>
			) : null}
		</>
	) : null;

	const localStage = localVideoTrack ? (
		<VideoTrack trackRef={localVideoTrack} className={VIDEO_FILL_CLASS} />
	) : null;

	const showPortraitMain = hasAvatarStage && (avatarOnMain || !canSwapVideos);
	const showLandscapeMain =
		(canSwapVideos && !avatarOnMain) ||
		(Boolean(localStage) && !hasAvatarStage);
	const showAudioOnlyMain = !hasAvatarStage && !localStage;
	const orbState = mapAgentStateToOrb(state, hasAgent);

	const mainContent = (() => {
		if (canSwapVideos) {
			return avatarOnMain ? avatarMainStage : localStage;
		}
		if (avatarMainStage) {
			return avatarMainStage;
		}
		if (localStage) {
			return localStage;
		}
		return (
			<div className="flex size-full min-h-56 flex-col items-center justify-center gap-5 px-4 sm:min-h-72">
				<SessionVoiceOrb
					state={orbState}
					agentAudioTrack={audioTrack}
					localMicTrack={
						isMicrophoneEnabled ? microphoneTrackRef : undefined
					}
				/>
				<p className="text-center text-sm text-muted-foreground">
					{statusLabel}
				</p>
			</div>
		);
	})();

	const pipContent = canSwapVideos
		? avatarOnMain
			? localStage
			: avatarVideo
		: hasLocalVideo && hasAvatarStage
			? localStage
			: null;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-4 md:p-5">
				<div className="relative flex h-full max-h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:max-w-4xl xl:max-w-5xl">
					<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 p-3 sm:p-4">
						<div
							className={cn(
								"relative flex h-full max-h-full w-full items-center justify-center",
								showAudioOnlyMain && "min-h-48",
							)}
						>
							<MainStage
								className={cn(
									showPortraitMain && PORTRAIT_STAGE_CLASS,
									showLandscapeMain && LANDSCAPE_STAGE_CLASS,
									showAudioOnlyMain &&
									"aspect-auto h-auto w-full max-w-md bg-transparent shadow-none",
								)}
							>
								{mainContent}
							</MainStage>
						</div>
					</div>

					{pipContent ? (
						<div className="pointer-events-none absolute right-3 bottom-20 z-10 sm:right-4 sm:bottom-24">
							<div className="pointer-events-auto">
								<PipStage>{pipContent}</PipStage>
							</div>
						</div>
					) : null}

					<div className="flex shrink-0 items-center justify-center gap-2 border-t bg-background/90 px-3 py-2.5 backdrop-blur">
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

						{canSwapVideos ? (
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="Swap avatar and camera video"
								className="size-9 rounded-full"
								onClick={() =>
									setAvatarOnMain((value) => !value)
								}
							>
								<ArrowLeftRightIcon className="size-4" />
							</Button>
						) : null}

						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Show conversation"
							aria-pressed={chatOpen}
							className={cn(
								"relative size-9 rounded-full",
								chatOpen &&
								"border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
							)}
							onClick={() => setChatOpen(true)}
						>
							<MessageSquareIcon className="size-4" />
							{hasChatContent && !chatOpen ? (
								<span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
							) : null}
						</Button>

						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="End preview session"
							className="size-9 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
							onClick={() => {
								isEndingRef.current = true;
								void room.disconnect();
								onEnd();
							}}
						>
							<PhoneOffIcon className="size-4" />
						</Button>
					</div>
				</div>
			</div>

			<Dialog open={chatOpen} onOpenChange={setChatOpen}>
				<DialogContent className="flex! max-h-[min(85dvh,40rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
						<DialogTitle>Conversation</DialogTitle>
						<DialogDescription>
							Live transcript, files, and agent messages for this
							preview.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="space-y-4 px-6 py-4">
							<section className="space-y-2">
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
				</DialogContent>
			</Dialog>

			<RoomAudioRenderer />
		</div>
	);
}

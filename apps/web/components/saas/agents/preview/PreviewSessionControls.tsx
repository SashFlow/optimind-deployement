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
import type { VoiceOrbState } from "@repo/ui/assistant-ui";
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
	MessageSquareIcon,
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	VideoIcon,
	VideoOffIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PreviewAvatar } from "@/lib/preview-avatar";
import type { Agent } from "@/services/api/types";
import MainStage from "./MainStage";
import MessageList from "./MessageList";
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
const AVATAR_STAGE_CLASS = "aspect-video w-full max-h-[700px] max-w-5xl";
const CAMERA_STAGE_CLASS = "aspect-video w-full max-h-[420px] max-w-3xl";

export function PreviewSessionControls({
	agent,
	avatar,
	onEnd,
}: {
	agent: Agent;
	avatar: PreviewAvatar;
	onEnd: () => void;
}) {
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const participants = useParticipants();
	const { state, audioTrack, videoTrack } = useVoiceAssistant();
	const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
	const cameraTrackRef = useLocalTrackRef(Track.Source.Camera);
	const microphoneTrackRef = useLocalTrackRef(Track.Source.Microphone);
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
	const isEndingRef = useRef(false);
	const didConnectRef = useRef(false);
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;
	const shouldWaitForAgent = isConnected && !hasAgent;
	// SpatialReal renders the avatar client-side from an animation data track on
	// this room, so there is no avatar video track to show; anam publishes one.
	const isSpatialReal = avatar.enabled && avatar.provider === "spatialreal";
	const hasAvatarVideo =
		avatar.enabled && !isSpatialReal && Boolean(videoTrack);
	const showAvatarFallback =
		avatar.enabled &&
		!isSpatialReal &&
		!hasAvatarVideo &&
		Boolean(avatar.previewUrl);
	const showAvatarWaiting =
		avatar.enabled &&
		!isSpatialReal &&
		!hasAvatarVideo &&
		!avatar.previewUrl;
	const hasLocalCamera =
		Boolean(cameraTrackRef) &&
		isCameraEnabled &&
		!cameraTrackRef?.publication.isMuted;
	const localVideoTrack = hasLocalCamera ? cameraTrackRef : undefined;
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

	const statusLabel = (() => {
		if (!isConnected) {
			return "Connecting…";
		}
		if (hasAgent) {
			if (state === "listening") {
				return `Listening · ${agent.name}`;
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

	// Both avatar kinds occupy the same stage; only the source differs.
	const avatarVideo = isSpatialReal ? (
		<SpatialRealAvatarStage room={room} avatarId={avatar.avatarId} />
	) : hasAvatarVideo ? (
		<VideoTrack trackRef={videoTrack} className={VIDEO_FILL_CLASS} />
	) : showAvatarFallback ? (
		// biome-ignore lint/performance/noImgElement: dynamic avatar URLs
		<img
			src={avatar.previewUrl ?? undefined}
			alt="Avatar preview"
			className={cn(VIDEO_FILL_CLASS, "opacity-90")}
		/>
	) : showAvatarWaiting ? (
		<div className="flex size-full items-center justify-center bg-black">
			<p className="text-xs text-white/70">Waiting for avatar…</p>
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

	const showAvatarMain = Boolean(avatarMainStage);
	const showCameraMain = !showAvatarMain && Boolean(localStage);
	const showAudioOnlyMain = !showAvatarMain && !localStage;
	const orbState = mapAgentStateToOrb(state, hasAgent);

	const mainContent = (() => {
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
									showAvatarMain && AVATAR_STAGE_CLASS,
									showCameraMain && CAMERA_STAGE_CLASS,
									showAudioOnlyMain &&
										"aspect-auto h-auto w-full max-w-md bg-transparent shadow-none",
								)}
							>
								{mainContent}
							</MainStage>
						</div>
					</div>

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

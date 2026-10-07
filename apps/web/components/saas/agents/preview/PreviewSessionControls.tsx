"use client";

import {
	AudioTrack,
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
import { Spinner } from "@repo/ui/spinner";
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
import {
	isClientRenderedAvatar,
	type PreviewAvatar,
} from "@/lib/preview-avatar";
import { formatRemainingDuration } from "@/lib/session-modalities";
import type { Agent } from "@/services/api/types";
import MainStage from "./MainStage";
import MessageList from "./MessageList";
import PipStage from "./PipStage";
import RpcCardList from "./RpcCardList";
import SessionVoiceOrb from "./SessionVoiceOrb";
import SpatialRealAvatarStage from "./SpatialRealAvatarStage";
import SpatiusAvatarStage from "./SpatiusAvatarStage";
import { usePreviewRoomData } from "./usePreviewRoomData";

/** Default SpatialReal avatar identity; SDK owns its audio for lip-sync. */
const SPATIALREAL_AVATAR_IDENTITY = "spatialreal-avatar";
/** Spatius avatar worker identity (see livekit-plugins-spatius). */
const SPATIUS_AVATAR_IDENTITY = "spatius-avatar-agent";

function isSpatialRealOwnedAudioIdentity(identity: string) {
	return (
		identity === SPATIALREAL_AVATAR_IDENTITY ||
		identity.startsWith("spatialreal-renderer-")
	);
}

function isAvatarWorkerIdentity(identity: string) {
	return (
		isSpatialRealOwnedAudioIdentity(identity) ||
		identity === SPATIUS_AVATAR_IDENTITY
	);
}

/**
 * Like RoomAudioRenderer, but skips the SpatialReal avatar participant so the
 * SDK keeps the master clock (and we avoid double playback).
 */
function SpatialRealSafeRoomAudio() {
	const tracks = useTracks(
		[
			Track.Source.Microphone,
			Track.Source.ScreenShareAudio,
			Track.Source.Unknown,
		],
		{ updateOnlyOn: [], onlySubscribed: true },
	).filter(
		(ref) =>
			!ref.participant.isLocal &&
			ref.publication.kind === Track.Kind.Audio &&
			!isSpatialRealOwnedAudioIdentity(ref.participant.identity),
	);

	return (
		<div style={{ display: "none" }}>
			{tracks.map((trackRef) => (
				<AudioTrack
					key={trackRef.publication.trackSid}
					trackRef={trackRef}
				/>
			))}
		</div>
	);
}

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

const VIDEO_FILL_CLASS =
	"absolute inset-0 size-full object-cover sm:static sm:inset-auto sm:object-contain";
/**
 * Mobile: absolute fill of the stage. Desktop: largest 16:9 that fits.
 */
const AVATAR_STAGE_CLASS =
	"absolute inset-0 size-auto rounded-none shadow-none sm:relative sm:inset-auto sm:aspect-video sm:h-full sm:max-h-full sm:w-auto sm:max-w-full sm:rounded-xl";
const CAMERA_STAGE_CLASS =
	"absolute inset-0 size-auto rounded-none shadow-none sm:relative sm:inset-auto sm:aspect-video sm:h-full sm:max-h-full sm:w-auto sm:max-w-full sm:rounded-xl";

export function PreviewSessionControls({
	agent,
	avatar,
	spatialRealAppId,
	spatialRealSessionToken,
	spatialRealRendererToken,
	spatiusAppId,
	onSpatiusAttached,
	serverUrl,
	onEnd,
	maxDurationSeconds = null,
	chatMandatory = false,
	proctoringEnabled = false,
	proctoringNotice = null,
	/** Inside the app shell — fill parent instead of locking to viewport height. */
	embedded = false,
}: {
	agent: Agent;
	avatar: PreviewAvatar;
	/** Returned by the session-start API; required for SpatialReal avatars. */
	spatialRealAppId?: string | null;
	spatialRealSessionToken?: string | null;
	spatialRealRendererToken?: string | null;
	/** Returned by the session-start API; required for Spatius avatars. */
	spatiusAppId?: string | null;
	/** Unlock LiveKitRoom connect after Spatius AvatarKit attach. */
	onSpatiusAttached?: () => void;
	serverUrl?: string | null;
	onEnd: () => void;
	maxDurationSeconds?: number | null;
	chatMandatory?: boolean;
	proctoringEnabled?: boolean;
	proctoringNotice?: string | null;
	embedded?: boolean;
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
		(p) =>
			p.identity !== localIdentity &&
			!isUserParticipant(p.identity) &&
			!isAvatarWorkerIdentity(p.identity),
	);
	const [agentWaitTimedOut, setAgentWaitTimedOut] = useState(false);
	const [chatOpen, setChatOpen] = useState(chatMandatory);
	const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
		typeof maxDurationSeconds === "number" && maxDurationSeconds > 0
			? maxDurationSeconds
			: null,
	);
	const isEndingRef = useRef(false);
	const didConnectRef = useRef(false);
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;

	// Proctoring requires a published camera track; keep it on for the session.
	useEffect(() => {
		if (!proctoringEnabled || !isConnected) {
			return;
		}
		if (isCameraEnabled) {
			return;
		}
		void room.localParticipant.setCameraEnabled(true).catch(() => {
			toast.error("Camera is required while proctoring is enabled");
		});
	}, [proctoringEnabled, isConnected, isCameraEnabled, room]);

	const shouldWaitForAgent = isConnected && !hasAgent;
	// SpatialReal / Spatius render client-side from motion data on this room;
	// anam publishes a conventional avatar video track.
	const isSpatialReal = avatar.enabled && avatar.provider === "spatialreal";
	const isSpatius = avatar.enabled && avatar.provider === "spatius";
	const isClientAvatar = isClientRenderedAvatar(avatar.provider);
	const hasAvatarVideo =
		avatar.enabled && !isClientAvatar && Boolean(videoTrack);
	const showAvatarFallback =
		avatar.enabled &&
		!isClientAvatar &&
		!hasAvatarVideo &&
		Boolean(avatar.previewUrl);
	const showAvatarWaiting =
		avatar.enabled &&
		!isClientAvatar &&
		!hasAvatarVideo &&
		!avatar.previewUrl;
	const hasLocalCamera =
		Boolean(cameraTrackRef?.publication) &&
		isCameraEnabled &&
		!cameraTrackRef?.publication.isMuted;
	const localVideoTrack = hasLocalCamera ? cameraTrackRef : undefined;
	const hasChatContent =
		messages.length > 0 || files.length > 0 || rpcCards.length > 0;

	if (!shouldWaitForAgent && agentWaitTimedOut) {
		setAgentWaitTimedOut(false);
	}

	useEffect(() => {
		if (chatMandatory) {
			setChatOpen(true);
		}
	}, [chatMandatory]);

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
		if (
			!isConnected ||
			typeof maxDurationSeconds !== "number" ||
			maxDurationSeconds <= 0
		) {
			return;
		}

		setRemainingSeconds(maxDurationSeconds);
		const startedAt = Date.now();
		const timer = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - startedAt) / 1000);
			const remaining = Math.max(0, maxDurationSeconds - elapsed);
			setRemainingSeconds(remaining);
			if (remaining <= 0) {
				window.clearInterval(timer);
				if (isEndingRef.current) {
					return;
				}
				isEndingRef.current = true;
				toast.message("Maximum call duration reached");
				void room.disconnect();
				onEndRef.current();
			}
		}, 1000);

		return () => window.clearInterval(timer);
	}, [isConnected, maxDurationSeconds, room]);

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

	const localStage = localVideoTrack ? (
		<VideoTrack
			trackRef={localVideoTrack}
			className={cn(VIDEO_FILL_CLASS, "scale-x-[-1]")}
		/>
	) : null;

	// User camera stays in focus whenever it's enabled; avatar falls back to PiP.
	const preferUserVideo = isCameraEnabled;
	const hasAvatarStage =
		avatar.enabled &&
		(isClientAvatar ||
			hasAvatarVideo ||
			showAvatarFallback ||
			showAvatarWaiting);
	const showCameraMain = preferUserVideo;
	const showAvatarMain = !preferUserVideo && hasAvatarStage;
	const showAudioOnlyMain = !preferUserVideo && !hasAvatarStage;
	const showAvatarPip = preferUserVideo && hasAvatarStage;

	// Client-rendered avatars and anam video share the same stage slot.
	// Spatius is mounted once below (never swapped main↔pip) so AvatarKit
	// attach survives camera toggles without disconnecting the LiveKit room.
	const avatarVideo = isSpatialReal ? (
		<SpatialRealAvatarStage
			room={room}
			appId={spatialRealAppId}
			sessionToken={spatialRealSessionToken}
			rendererToken={spatialRealRendererToken}
			serverUrl={serverUrl}
			avatarId={avatar.avatarId}
			compact={showAvatarPip}
		/>
	) : isSpatius ? null : hasAvatarVideo ? (
		<VideoTrack trackRef={videoTrack} className={VIDEO_FILL_CLASS} />
	) : showAvatarFallback || showAvatarWaiting ? (
		<div className="flex size-full flex-col items-center justify-center gap-3 bg-muted/40">
			<Spinner
				className={cn(
					"text-muted-foreground",
					showAvatarPip ? "size-5" : "size-8",
				)}
			/>
			{showAvatarPip ? null : (
				<p className="text-sm text-muted-foreground">Connecting…</p>
			)}
		</div>
	) : null;

	const spatiousStage =
		isSpatius && hasAvatarStage ? (
			<SpatiusAvatarStage
				room={room}
				appId={spatiusAppId}
				avatarId={avatar.avatarId}
				compact={showAvatarPip}
				onAttached={onSpatiusAttached}
			/>
		) : null;
	const orbState = mapAgentStateToOrb(state, hasAgent);

	const connectingContent = (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 sm:static sm:inset-auto sm:min-h-72 sm:size-full">
			<Spinner className="size-8 text-muted-foreground" />
			<p className="text-center text-sm text-muted-foreground">
				Connecting…
			</p>
		</div>
	);

	const avatarMainContent = avatarVideo ? (
		<>
			{avatarVideo}
			{/* {showAvatarFallback ||
				((hasAvatarVideo || isSpatialReal) && !hasAgent) ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 to-transparent p-3">
					<p className="text-xs text-white/90">{statusLabel}</p>
				</div>
			) : null} */}
		</>
	) : null;

	const cameraMainContent = (
		<>
			{localStage ?? connectingContent}
			{/* {localStage && !hasAgent ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 to-transparent p-3">
					<p className="text-xs text-white/90">{statusLabel}</p>
				</div>
			) : null} */}
		</>
	);

	const orbMainContent = (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 sm:static sm:inset-auto sm:min-h-72 sm:size-full">
			<SessionVoiceOrb
				state={orbState}
				agentAudioTrack={audioTrack}
				localMicTrack={
					isMicrophoneEnabled ? microphoneTrackRef : undefined
				}
			/>
			{/* <p className="text-center text-sm text-muted-foreground">
				{statusLabel}
			</p> */}
		</div>
	);

	const mainContent = (() => {
		if (isSpatius) {
			// Spatius renders in the stable overlay below; main slot is camera or empty.
			if (showCameraMain) {
				return cameraMainContent;
			}
			if (!isConnected && !showAvatarMain) {
				return connectingContent;
			}
			if (showAvatarMain) {
				return null;
			}
			if (!isConnected) {
				return connectingContent;
			}
			return orbMainContent;
		}
		if (showCameraMain) {
			return cameraMainContent;
		}
		if (!isConnected && !showAvatarMain) {
			return connectingContent;
		}
		// Keep client-rendered avatars mounted while connecting so they can init.
		if (showAvatarMain) {
			return avatarMainContent ?? connectingContent;
		}
		if (!isConnected) {
			return connectingContent;
		}
		return orbMainContent;
	})();

	const controlButtonClass =
		"inline-flex size-10 md:size-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-colors";

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden bg-black sm:bg-transparent",
				embedded
					? "min-h-0 flex-1"
					: "h-dvh sm:h-auto sm:min-h-0 sm:flex-1",
			)}
		>
			<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden sm:items-center sm:justify-center sm:p-4 md:p-5">
				<div
					className={cn(
						"relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black sm:h-full sm:max-h-full sm:max-w-5xl sm:rounded-xl sm:border sm:bg-card sm:shadow-sm xl:max-w-6xl",
						embedded && "sm:max-w-none",
					)}
				>
					{/* Full-bleed stage; controls float over the video */}
					<div className="relative min-h-0 flex-1 overflow-hidden bg-black sm:bg-muted/30">
						{(proctoringEnabled || remainingSeconds != null) && (
							<div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 bg-linear-to-b from-black/70 via-black/30 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 text-xs text-white/90 sm:items-center sm:px-3 sm:pt-2.5 sm:pb-2.5">
								{proctoringEnabled ? (
									<span className="rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
										{proctoringNotice?.trim() ||
											"Proctoring enabled"}
									</span>
								) : (
									<span />
								)}
								{remainingSeconds != null ? (
									<span className="rounded-full bg-black/45 px-2.5 py-1 font-medium text-white backdrop-blur-sm">
										{formatRemainingDuration(
											remainingSeconds,
										)}{" "}
										left
									</span>
								) : null}
							</div>
						)}
						<div
							className={cn(
								"absolute inset-0 flex items-center justify-center sm:relative sm:inset-auto sm:h-full sm:w-full",
								showAudioOnlyMain && "min-h-48",
							)}
						>
							<MainStage
								className={cn(
									(showAvatarMain || isSpatius) &&
										!showCameraMain &&
										AVATAR_STAGE_CLASS,
									showCameraMain && CAMERA_STAGE_CLASS,
									showAudioOnlyMain &&
										!isSpatius &&
										"absolute inset-0 aspect-auto h-auto w-full bg-transparent shadow-none sm:relative sm:inset-auto",
								)}
							>
								{mainContent}
								{spatiousStage ? (
									// Same React parent for main and PiP — only CSS changes —
									// so AvatarKit attach is not torn down on camera toggle.
									<div
										className={cn(
											"absolute overflow-hidden",
											showAvatarPip
												? "top-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))] right-3 z-10 h-28 aspect-square rounded-xl border border-white/20 bg-white shadow-lg sm:right-4 sm:h-36 sm:rounded-lg"
												: "inset-0 z-0 bg-white",
										)}
									>
										<div
											className="absolute top-0 left-0 size-full origin-top-left"
											style={
												showAvatarPip
													? {
															width: "200%",
															height: "200%",
															transform:
																"scale(0.5)",
														}
													: undefined
											}
										>
											{spatiousStage}
										</div>
									</div>
								) : showAvatarPip && avatarVideo ? (
									<div className="absolute top-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))] right-3 z-10 sm:right-4">
										<PipStage
											className="h-28 rounded-xl border-white/20 shadow-lg sm:h-36 sm:rounded-lg"
											renderScale={isClientAvatar ? 2 : 1}
										>
											{avatarVideo}
										</PipStage>
									</div>
								) : null}
							</MainStage>
						</div>

						{/* Floating controls over video */}
						<div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/55 via-black/20 to-transparent pt-16 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
							<div className="pointer-events-auto flex items-center justify-center gap-3 px-4 sm:gap-2.5">
								<TrackToggle
									source={Track.Source.Microphone}
									showIcon={false}
									className={cn(
										controlButtonClass,
										isMicrophoneEnabled
											? "border-transparent bg-primary text-primary-foreground shadow-primary/25"
											: "border-white/20 bg-black/45 text-white hover:bg-black/60",
									)}
								>
									{isMicrophoneEnabled ? (
										<MicIcon className="size-4 md:size-5" />
									) : (
										<MicOffIcon className="size-4 md:size-5" />
									)}
								</TrackToggle>

								<TrackToggle
									source={Track.Source.Camera}
									showIcon={false}
									disabled={proctoringEnabled}
									title={
										proctoringEnabled
											? "Camera is required for proctoring"
											: undefined
									}
									className={cn(
										controlButtonClass,
										isCameraEnabled
											? "border-transparent bg-primary text-primary-foreground shadow-primary/25"
											: "border-white/20 bg-black/45 text-white hover:bg-black/60",
										proctoringEnabled &&
											"cursor-not-allowed opacity-80",
									)}
								>
									{isCameraEnabled ? (
										<VideoIcon className="size-4 md:size-5" />
									) : (
										<VideoOffIcon className="size-5 sm:size-4" />
									)}
								</TrackToggle>

								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Show conversation"
									aria-pressed={chatOpen}
									className={cn(
										controlButtonClass,
										"relative border-white/20 bg-black/45 text-white hover:bg-black/60 hover:text-white",
										chatOpen &&
											"border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
									)}
									onClick={() => setChatOpen(true)}
								>
									<MessageSquareIcon className="size-4 md:size-5" />
									{hasChatContent && !chatOpen ? (
										<span className="absolute top-2 right-2 size-2 rounded-full bg-primary sm:top-1.5 sm:right-1.5 sm:size-1.5" />
									) : null}
								</Button>

								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="End preview session"
									className={cn(
										controlButtonClass,
										"border-red-400/40 bg-red-600/90 text-white hover:bg-red-600 hover:text-white",
									)}
									onClick={() => {
										isEndingRef.current = true;
										void room.disconnect();
										onEnd();
									}}
								>
									<PhoneOffIcon className="size-4 md:size-5" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Dialog
				open={chatOpen}
				onOpenChange={(open) => {
					if (chatMandatory && !open) {
						return;
					}
					setChatOpen(open);
				}}
			>
				<DialogContent className="flex! max-h-[min(90dvh,40rem)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]">
					<DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left sm:px-6 sm:py-4">
						<DialogTitle>Conversation</DialogTitle>
						<DialogDescription>
							Live transcript, files, and agent messages for this
							preview.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="space-y-4 px-4 py-4 sm:px-6">
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

			{isSpatialReal ? (
				<SpatialRealSafeRoomAudio />
			) : (
				<RoomAudioRenderer />
			)}
		</div>
	);
}

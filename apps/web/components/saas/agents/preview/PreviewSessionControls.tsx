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

const VIDEO_FILL_CLASS = "size-full object-contain";
/** Largest 16:9 that fits the available stage without overflowing. */
const AVATAR_STAGE_CLASS =
	"aspect-video h-full max-h-full w-auto max-w-full shadow-none";
const CAMERA_STAGE_CLASS =
	"aspect-video h-full max-h-full w-auto max-w-full shadow-none";

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
		<div className="flex size-full min-h-56 flex-col items-center justify-center gap-3 px-4 sm:min-h-72">
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
		<div className="flex size-full min-h-56 flex-col items-center justify-center gap-5 px-4 sm:min-h-72">
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

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-4 md:p-5">
				<div className="relative flex h-full max-h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-sm xl:max-w-6xl">
					<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30">
						{(proctoringEnabled || remainingSeconds != null) && (
							<div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-linear-to-b from-black/60 to-transparent px-3 py-2.5 text-xs text-white/90">
								{proctoringEnabled ? (
									<span>
										{proctoringNotice?.trim() ||
											"Proctoring enabled"}
									</span>
								) : (
									<span />
								)}
								{remainingSeconds != null ? (
									<span className="font-medium text-white">
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
								"relative flex h-full max-h-full w-full items-center justify-center",
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
										"aspect-auto h-auto w-full bg-transparent shadow-none",
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
												? "right-3 bottom-3 z-10 h-36 aspect-square rounded-lg border bg-white sm:right-4 sm:bottom-4"
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
									<div className="absolute right-3 bottom-3 z-10 sm:right-4 sm:bottom-4">
										<PipStage
											className="rounded-lg"
											renderScale={isClientAvatar ? 2 : 1}
										>
											{avatarVideo}
										</PipStage>
									</div>
								) : null}
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
							disabled={proctoringEnabled}
							title={
								proctoringEnabled
									? "Camera is required for proctoring"
									: undefined
							}
							className={cn(
								"inline-flex size-9 items-center justify-center rounded-full border transition-colors",
								isCameraEnabled
									? "border-transparent bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
								proctoringEnabled &&
								"cursor-not-allowed opacity-80",
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

			<Dialog
				open={chatOpen}
				onOpenChange={(open) => {
					if (chatMandatory && !open) {
						return;
					}
					setChatOpen(open);
				}}
			>
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

			{isSpatialReal ? (
				<SpatialRealSafeRoomAudio />
			) : (
				<RoomAudioRenderer />
			)}
		</div>
	);
}

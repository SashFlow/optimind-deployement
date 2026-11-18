"use client";

import { useRoomContext } from "@livekit/components-react";
import { orpcClient } from "@shared/lib/orpc-client";
import { ParticipantKind, RoomEvent, type Room, Track } from "livekit-client";
import {
	type MutableRefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

const MAX_RECONNECT_ATTEMPTS = 3;
const AWAY_HIDDEN_MS = 8_000;

interface AgentContext {
	state: string;
	action: "say" | "generate_reply" | "silent";
	type: "customer_away" | "customer_back";
	details?: Record<string, unknown>;
}

async function sendContext(room: Room, context: AgentContext) {
	const agent = Array.from(room.remoteParticipants.values()).find(
		(p) => p.kind === ParticipantKind.AGENT,
	);
	if (!agent) {
		return;
	}
	try {
		await room.localParticipant.performRpc({
			destinationIdentity: agent.identity,
			method: "add_context",
			payload: JSON.stringify(context),
		});
	} catch (error) {
		console.error("add_context RPC failed", error);
	}
}

export interface UseSessionReconnectOptions {
	/** Session id for the refresh API. Null disables reconnect. */
	sessionId?: string | null;
	/** Current participant JWT (updated after each successful refresh). */
	participantToken?: string | null;
	serverUrl?: string | null;
	/** Parent sets this before intentional hangup / max-duration end. */
	isEndingRef: MutableRefObject<boolean>;
	/** Persist reminted token so LiveKitRoom / uploads stay in sync. */
	onParticipantTokenRefresh?: (token: string) => void;
	/** Called after reconnect attempts are exhausted. */
	onGiveUp: () => void;
}

/**
 * Mid-session call-drop hardening: remint participant JWT + reconnect on
 * unexpected disconnect, and notify the agent when the tab is hidden/shown.
 */
export function useSessionReconnect({
	sessionId = null,
	participantToken = null,
	serverUrl = null,
	isEndingRef,
	onParticipantTokenRefresh,
	onGiveUp,
}: UseSessionReconnectOptions) {
	const room = useRoomContext();
	const [reconnecting, setReconnecting] = useState(false);
	const attemptsRef = useRef(0);
	const reconnectingRef = useRef(false);
	const tokenRef = useRef(participantToken);
	const serverUrlRef = useRef(serverUrl);
	const sessionIdRef = useRef(sessionId);
	const onGiveUpRef = useRef(onGiveUp);
	const onTokenRef = useRef(onParticipantTokenRefresh);
	const awaySentRef = useRef(false);
	const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didConnectRef = useRef(false);

	tokenRef.current = participantToken;
	serverUrlRef.current = serverUrl;
	sessionIdRef.current = sessionId;
	onGiveUpRef.current = onGiveUp;
	onTokenRef.current = onParticipantTokenRefresh;

	const tryReconnect = useCallback(async () => {
		if (isEndingRef.current || reconnectingRef.current) {
			return false;
		}
		const id = sessionIdRef.current;
		const token = tokenRef.current;
		const url = serverUrlRef.current;
		if (!id || !token || !url) {
			return false;
		}
		if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
			return false;
		}

		reconnectingRef.current = true;
		setReconnecting(true);
		attemptsRef.current += 1;

		try {
			const refreshed = await orpcClient.sessions.refreshParticipantToken(
				{
					id,
					participantToken: token,
				},
			);
			const nextToken = refreshed.participantToken;
			const nextUrl = refreshed.serverUrl || url;
			tokenRef.current = nextToken;
			serverUrlRef.current = nextUrl;
			onTokenRef.current?.(nextToken);

			await room.connect(nextUrl, nextToken);
			attemptsRef.current = 0;
			toast.success("Reconnected to session");
			return true;
		} catch (error) {
			console.error("Session reconnect failed", error);
			return false;
		} finally {
			reconnectingRef.current = false;
			setReconnecting(false);
		}
	}, [isEndingRef, room]);

	useEffect(() => {
		function handleConnected() {
			didConnectRef.current = true;
			attemptsRef.current = 0;
		}

		async function handleDisconnected() {
			if (isEndingRef.current) {
				return;
			}
			if (!didConnectRef.current) {
				onGiveUpRef.current();
				return;
			}
			const ok = await tryReconnect();
			if (!ok) {
				toast.error("Session disconnected");
				onGiveUpRef.current();
			}
		}

		function handleMediaDeviceError(error: Error) {
			toast.error(error.message || "Media device error");
		}

		room.on(RoomEvent.Connected, handleConnected);
		room.on(RoomEvent.Disconnected, handleDisconnected);
		room.on(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		return () => {
			room.off(RoomEvent.Connected, handleConnected);
			room.off(RoomEvent.Disconnected, handleDisconnected);
			room.off(RoomEvent.MediaDevicesError, handleMediaDeviceError);
		};
	}, [isEndingRef, room, tryReconnect]);

	// Tab background / phone-call interruption signal via visibility.
	useEffect(() => {
		function clearHiddenTimer() {
			if (hiddenTimerRef.current) {
				clearTimeout(hiddenTimerRef.current);
				hiddenTimerRef.current = null;
			}
		}

		function onVisibility() {
			if (isEndingRef.current || !didConnectRef.current) {
				return;
			}
			if (document.visibilityState === "hidden") {
				clearHiddenTimer();
				hiddenTimerRef.current = setTimeout(() => {
					if (
						document.visibilityState !== "hidden" ||
						isEndingRef.current ||
						awaySentRef.current
					) {
						return;
					}
					awaySentRef.current = true;
					void sendContext(room, {
						state: "The customer left the app or switched away. Pause and wait briefly, then ask if they are still there.",
						action: "say",
						type: "customer_away",
						details: { at: Date.now() },
					});
				}, AWAY_HIDDEN_MS);
				return;
			}

			clearHiddenTimer();
			if (awaySentRef.current) {
				awaySentRef.current = false;
				void sendContext(room, {
					state: "The customer is back on the screen. Continue the verification.",
					action: "say",
					type: "customer_back",
					details: { at: Date.now() },
				});
			}
		}

		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			clearHiddenTimer();
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [isEndingRef, room]);

	// Local camera muted while session is live (e.g. OS interrupt).
	useEffect(() => {
		function onTrackMuted(
			_publication: unknown,
			participant: { isLocal?: boolean },
		) {
			if (isEndingRef.current || !didConnectRef.current) {
				return;
			}
			if (!participant.isLocal) {
				return;
			}
			const cam = room.localParticipant.getTrackPublication(
				Track.Source.Camera,
			);
			if (cam?.isMuted) {
				toast.message("Camera turned off — please keep it on");
			}
		}
		room.on(RoomEvent.TrackMuted, onTrackMuted);
		return () => {
			room.off(RoomEvent.TrackMuted, onTrackMuted);
		};
	}, [isEndingRef, room]);

	return { reconnecting };
}

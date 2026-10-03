"use client";

import { useMaybeRoomContext } from "@livekit/components-react";
import type { LiveKitAvatarSession, SessionState } from "@spatialreal/web-sdk";
import type { Room } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
	SpatialRealAvatarConnectionStatus,
	SpatialRealAvatarState,
	UseSpatialRealAvatarOptions,
	UseSpatialRealAvatarResult,
} from "@/types/spatialreal-avatar";

function toError(error: unknown, fallbackMessage: string) {
	return error instanceof Error ? error : new Error(fallbackMessage);
}

function mapSessionState(
	state: SessionState,
): SpatialRealAvatarConnectionStatus | null {
	switch (state) {
		case "connecting":
			return "connecting";
		case "live":
			return "connected";
		case "ending":
			return "disconnecting";
		case "idle":
			return "idle";
		case "disposed":
			return "idle";
		default:
			return null;
	}
}

function createIdleState(): SpatialRealAvatarState {
	return {
		downloadProgress: null,
		error: null,
		isConnected: false,
		isLoading: false,
		room: null,
		status: "idle",
	};
}

function waitForRoomConnected(room: Room, signal: AbortSignal) {
	return new Promise<void>((resolve) => {
		if (room.state === ConnectionState.Connected || signal.aborted) {
			resolve();
			return;
		}
		const done = () => {
			room.off(RoomEvent.Connected, done);
			signal.removeEventListener("abort", done);
			resolve();
		};
		room.on(RoomEvent.Connected, done);
		signal.addEventListener("abort", done);
	});
}

/**
 * Renders a SpatialReal avatar via a subscribe-only LiveKit participant while
 * the caller-owned <LiveKitRoom> keeps mic, proctoring, and session chrome.
 * Avatar audio is played by the SpatialReal SDK (lip-sync clock); mute the
 * avatar identity in the user room's audio renderer to avoid double playback.
 */
export function useSpatialRealAvatar(
	options: UseSpatialRealAvatarOptions,
): UseSpatialRealAvatarResult {
	const {
		appId,
		avatarId,
		enabled = true,
		onAvatarError,
		onConnected,
		onDisconnected,
		onStateChange,
		rendererToken,
		room: roomOption,
		sdkLogLevel = "warning",
		serverUrl,
		sessionToken,
	} = options;

	const contextRoom = useMaybeRoomContext();
	const room = roomOption ?? contextRoom ?? null;

	const [containerElement, setContainerElement] =
		useState<HTMLDivElement | null>(null);
	const [containerReady, setContainerReady] = useState(false);
	const [state, setState] = useState<SpatialRealAvatarState>(createIdleState);

	const sessionRef = useRef<LiveKitAvatarSession | null>(null);
	const teardownRef = useRef<Promise<void>>(Promise.resolve());
	const callbacksRef = useRef({
		onAvatarError,
		onConnected,
		onDisconnected,
		onStateChange,
	});

	useEffect(() => {
		callbacksRef.current = {
			onAvatarError,
			onConnected,
			onDisconnected,
			onStateChange,
		};
	}, [onAvatarError, onConnected, onDisconnected, onStateChange]);

	const updateStatus = useCallback(
		(
			status: SpatialRealAvatarConnectionStatus,
			activeRoom?: Room | null,
		) => {
			setState((previous) => ({
				...previous,
				isConnected: status === "connected",
				isLoading: status === "initializing" || status === "connecting",
				room: activeRoom === undefined ? previous.room : activeRoom,
				status,
			}));

			callbacksRef.current.onStateChange?.(status);
		},
		[],
	);

	const teardownSession = useCallback(
		async (session: LiveKitAvatarSession | null) => {
			if (sessionRef.current === session) {
				sessionRef.current = null;
			}

			if (!session) {
				return;
			}

			try {
				await session.end();
			} catch {
				// Ignore teardown errors so unmounts stay predictable.
			}

			try {
				await session.dispose();
			} catch {
				// Ignore teardown errors so unmounts stay predictable.
			}
		},
		[],
	);

	const setContainerRef = useCallback((node: HTMLDivElement | null) => {
		setContainerElement(node);
		setContainerReady(
			node ? node.offsetWidth > 0 && node.offsetHeight > 0 : false,
		);
	}, []);

	const disconnect = useCallback(async () => {
		const session = sessionRef.current;

		if (!session) {
			setState(createIdleState());
			return;
		}

		updateStatus("disconnecting");
		await teardownSession(session);
		setState(createIdleState());
	}, [teardownSession, updateStatus]);

	const reconnect = useCallback(async () => {
		const session = sessionRef.current;

		if (!session) {
			throw new Error("Avatar session is not ready yet.");
		}

		updateStatus("connecting");

		try {
			await session.reconnect();
			updateStatus("connected", session.room);
		} catch (error) {
			const normalizedError = toError(
				error,
				"Failed to reconnect avatar stream.",
			);
			setState((previous) => ({
				...previous,
				error: normalizedError,
				isConnected: false,
				isLoading: false,
				status: "error",
			}));
			callbacksRef.current.onAvatarError?.(normalizedError);
			callbacksRef.current.onStateChange?.("error");
			throw normalizedError;
		}
	}, [updateStatus]);

	useEffect(() => {
		if (!containerElement) {
			return;
		}

		const markReady = () => {
			setContainerReady(
				containerElement.offsetWidth > 0 &&
					containerElement.offsetHeight > 0,
			);
		};

		const observer = new ResizeObserver(markReady);
		observer.observe(containerElement);
		const frame = requestAnimationFrame(markReady);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [containerElement]);

	useEffect(() => {
		if (
			!enabled ||
			!room ||
			!containerReady ||
			!containerElement ||
			!sessionToken ||
			!serverUrl ||
			!rendererToken
		) {
			return;
		}

		const abort = new AbortController();
		const pendingTeardown = teardownRef.current;
		let session: LiveKitAvatarSession | null = null;
		const unsubscribers: Array<() => void> = [];

		const handleError = (error: unknown) => {
			if (abort.signal.aborted) {
				return;
			}

			const normalizedError = toError(error, "Avatar stream error.");
			setState((previous) => ({
				...previous,
				error: normalizedError,
				isConnected: false,
				isLoading: false,
				status: "error",
			}));
			callbacksRef.current.onAvatarError?.(normalizedError);
			callbacksRef.current.onStateChange?.("error");
		};

		async function connectAvatar(
			container: HTMLDivElement,
			userRoom: Room,
		) {
			updateStatus("initializing", userRoom);
			setState((previous) => ({
				...previous,
				downloadProgress: null,
				error: null,
			}));

			await pendingTeardown;
			if (abort.signal.aborted) {
				return;
			}

			await waitForRoomConnected(userRoom, abort.signal);
			if (abort.signal.aborted) {
				return;
			}

			const { SpatialReal, createUnlockedAudioContext } = await import(
				"@spatialreal/web-sdk"
			);
			if (abort.signal.aborted) {
				return;
			}

			// Join click already happened; unlock audio before awaiting start().
			const audioContext = createUnlockedAudioContext();
			const sr = new SpatialReal({ appId, logLevel: sdkLogLevel });

			updateStatus("connecting", userRoom);
			session = await sr.createSession({
				avatarId,
				credential: sessionToken,
				container,
				livekit: { url: serverUrl, token: rendererToken },
				mic: "manual",
				audioContext,
				signal: abort.signal,
			});
			if (abort.signal.aborted) {
				await teardownSession(session);
				session = null;
				return;
			}

			sessionRef.current = session;

			unsubscribers.push(
				session.on("state", ({ current }) => {
					if (abort.signal.aborted) {
						return;
					}
					const mapped = mapSessionState(current);
					if (!mapped) {
						return;
					}
					if (mapped === "idle" && current === "idle") {
						setState(createIdleState());
						callbacksRef.current.onStateChange?.("idle");
						callbacksRef.current.onDisconnected?.();
						return;
					}
					updateStatus(mapped, session?.room ?? userRoom);
				}),
			);

			unsubscribers.push(
				session.on("error", ({ error }) => {
					handleError(error);
				}),
			);

			await session.start();
			if (abort.signal.aborted) {
				await teardownSession(session);
				session = null;
				return;
			}

			updateStatus("connected", session.room);
			callbacksRef.current.onConnected?.(session.room);
		}

		void connectAvatar(containerElement, room).catch((error: unknown) => {
			if (!abort.signal.aborted) {
				handleError(toError(error, "Failed to initialize avatar."));
			}
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			teardownRef.current = teardownSession(session);
		});

		return () => {
			abort.abort();
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			setState(createIdleState());
			teardownRef.current = teardownSession(session);
		};
	}, [
		appId,
		avatarId,
		containerElement,
		containerReady,
		enabled,
		rendererToken,
		room,
		sdkLogLevel,
		serverUrl,
		sessionToken,
		teardownSession,
		updateStatus,
	]);

	return useMemo(
		() => ({
			...state,
			containerRef: setContainerRef,
			disconnect,
			reconnect,
		}),
		[disconnect, reconnect, setContainerRef, state],
	);
}

"use client";

import { ConnectionState, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ensureSpatiusInitialized } from "@/lib/spatius-preload";
import type {
	SpatiusAvatarConnectionStatus,
	SpatiusAvatarState,
	UseSpatiusAvatarOptions,
	UseSpatiusAvatarResult,
} from "@/types/spatius-avatar";

type AvatarPlayer = import("@spatius/avatarkit-rtc").AvatarPlayer;
type AvatarView = import("@spatius/avatarkit").AvatarView;

type BoundSession = {
	appId: string;
	avatarId: string;
	player: AvatarPlayer;
	avatarView: AvatarView;
};

/** Survives React remounts (Strict Mode / layout swaps) for a given Room. */
const sessionsByRoom = new WeakMap<object, BoundSession>();

async function disposeBoundSession(session: BoundSession) {
	try {
		await session.player.detach();
	} catch {
		// ignore
	}
	try {
		session.avatarView.dispose();
	} catch {
		// ignore
	}
}

function toError(error: unknown, fallbackMessage: string) {
	return error instanceof Error ? error : new Error(fallbackMessage);
}

function isAbortError(error: unknown) {
	return (
		(error instanceof DOMException && error.name === "AbortError") ||
		(error instanceof Error && error.name === "AbortError")
	);
}

function createIdleState(): SpatiusAvatarState {
	return {
		error: null,
		isConnected: false,
		isLoading: false,
		status: "idle",
	};
}

function waitForContainerSize(element: HTMLElement, signal: AbortSignal) {
	if (element.offsetWidth > 0 && element.offsetHeight > 0) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve, reject) => {
		const onAbort = () => {
			observer.disconnect();
			reject(new DOMException("Aborted", "AbortError"));
		};

		const observer = new ResizeObserver(() => {
			if (element.offsetWidth > 0 && element.offsetHeight > 0) {
				observer.disconnect();
				signal.removeEventListener("abort", onAbort);
				resolve();
			}
		});

		observer.observe(element);
		signal.addEventListener("abort", onAbort, { once: true });
		if (signal.aborted) {
			onAbort();
		}
	});
}

/**
 * Renders a Spatius avatar via AvatarKit attached to the host LiveKit room.
 * Attach is bound to the Room instance so React remounts do not detach or
 * disconnect the host session (which would kill the call).
 *
 * @see https://docs.spatius.ai/livekit-agents/client
 * @see https://docs.spatius.ai/sdk-reference/web-sdk/rtc-adapter#host-owned-rtc-clients
 */
export function useSpatiusAvatar(
	options: UseSpatiusAvatarOptions,
): UseSpatiusAvatarResult {
	const {
		appId,
		avatarId,
		enabled = true,
		onAttached,
		onAvatarError,
		onConnected,
		onDisconnected,
		onStateChange,
		room,
	} = options;

	const [containerElement, setContainerElement] =
		useState<HTMLDivElement | null>(null);
	const [state, setState] = useState<SpatiusAvatarState>(createIdleState);

	const playerRef = useRef<AvatarPlayer | null>(null);
	const avatarViewRef = useRef<AvatarView | null>(null);
	const attachedNotifiedRef = useRef(false);
	const callbacksRef = useRef({
		onAttached,
		onAvatarError,
		onConnected,
		onDisconnected,
		onStateChange,
	});

	useEffect(() => {
		callbacksRef.current = {
			onAttached,
			onAvatarError,
			onConnected,
			onDisconnected,
			onStateChange,
		};
	}, [onAttached, onAvatarError, onConnected, onDisconnected, onStateChange]);

	const updateStatus = useCallback(
		(status: SpatiusAvatarConnectionStatus) => {
			setState((previous) => ({
				...previous,
				isConnected: status === "connected",
				isLoading: status === "initializing" || status === "connecting",
				status,
			}));
			callbacksRef.current.onStateChange?.(status);
		},
		[],
	);

	const notifyAttached = useCallback(() => {
		if (attachedNotifiedRef.current) {
			return;
		}
		attachedNotifiedRef.current = true;
		callbacksRef.current.onAttached?.();
	}, []);

	const setContainerRef = useCallback((node: HTMLDivElement | null) => {
		setContainerElement(node);
	}, []);

	const disconnect = useCallback(async () => {
		updateStatus("disconnecting");
		const existing = sessionsByRoom.get(room);
		sessionsByRoom.delete(room);
		playerRef.current = null;
		avatarViewRef.current = null;
		attachedNotifiedRef.current = false;

		if (existing) {
			await disposeBoundSession(existing);
		}
		setState(createIdleState());
		callbacksRef.current.onDisconnected?.();
	}, [room, updateStatus]);

	// Dispose AvatarKit when the host LiveKit room disconnects (call ended).
	useEffect(() => {
		const onRoomDisconnected = () => {
			const existing = sessionsByRoom.get(room);
			if (!existing) {
				return;
			}
			sessionsByRoom.delete(room);
			attachedNotifiedRef.current = false;
			playerRef.current = null;
			avatarViewRef.current = null;
			void disposeBoundSession(existing);
		};

		room.on(RoomEvent.Disconnected, onRoomDisconnected);
		return () => {
			room.off(RoomEvent.Disconnected, onRoomDisconnected);
		};
	}, [room]);

	useEffect(() => {
		if (!enabled || !room || !containerElement) {
			return;
		}

		const abort = new AbortController();

		const handleError = (error: unknown) => {
			if (abort.signal.aborted || isAbortError(error)) {
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
			notifyAttached();
		};

		async function attachAvatar(container: HTMLDivElement) {
			const existing = sessionsByRoom.get(room);
			if (
				existing &&
				existing.appId === appId &&
				existing.avatarId === avatarId
			) {
				playerRef.current = existing.player;
				avatarViewRef.current = existing.avatarView;
				updateStatus("connected");
				notifyAttached();
				return;
			}

			updateStatus("initializing");
			setState((previous) => ({
				...previous,
				error: null,
			}));

			await waitForContainerSize(container, abort.signal);
			if (abort.signal.aborted) {
				return;
			}

			const sdk = await ensureSpatiusInitialized(appId);
			if (abort.signal.aborted) {
				return;
			}

			updateStatus("connecting");

			// Only attach while the host room is still disconnected.
			if (room.state !== ConnectionState.Disconnected) {
				throw new Error(
					"Spatius must attach before the LiveKit room connects. " +
						"Keep SpatiusAvatarStage mounted in a stable tree position.",
				);
			}

			const avatar = await sdk.AvatarManager.shared.load(avatarId);
			if (abort.signal.aborted) {
				return;
			}

			const avatarView = new sdk.AvatarView(avatar, container);
			await new Promise<void>((resolve, reject) => {
				const timeout = window.setTimeout(() => {
					reject(new Error("Spatius avatar view timed out."));
				}, 60_000);
				avatarView.onFirstRendering = () => {
					window.clearTimeout(timeout);
					resolve();
				};
				abort.signal.addEventListener(
					"abort",
					() => {
						window.clearTimeout(timeout);
						reject(new DOMException("Aborted", "AbortError"));
					},
					{ once: true },
				);
			});
			if (abort.signal.aborted) {
				avatarView.dispose();
				return;
			}

			if (room.state !== ConnectionState.Disconnected) {
				avatarView.dispose();
				throw new Error(
					"LiveKit room connected before Spatius attach finished.",
				);
			}

			const player = new sdk.AvatarPlayer(
				new sdk.LiveKitProvider(),
				avatarView,
			);

			await player.attach(room);
			if (abort.signal.aborted) {
				try {
					await player.detach();
				} catch {
					// ignore
				}
				avatarView.dispose();
				return;
			}

			sessionsByRoom.set(room, {
				appId,
				avatarId,
				player,
				avatarView,
			});
			playerRef.current = player;
			avatarViewRef.current = avatarView;

			updateStatus("connected");
			callbacksRef.current.onConnected?.();
			notifyAttached();
		}

		void attachAvatar(containerElement).catch((error: unknown) => {
			if (abort.signal.aborted || isAbortError(error)) {
				return;
			}
			handleError(toError(error, "Failed to initialize Spatius avatar."));
		});

		return () => {
			abort.abort();
			// Do NOT detach or disconnect here. Remounts (main↔pip, Strict Mode,
			// parent useMemo) must not kill the LiveKit session. Attachment is
			// owned by sessionsByRoom until disconnect() or session end.
			playerRef.current = null;
			avatarViewRef.current = null;
		};
	}, [
		appId,
		avatarId,
		containerElement,
		enabled,
		notifyAttached,
		room,
		updateStatus,
	]);

	// Tear down AvatarKit only when the Spatius session is actually ending.
	useEffect(() => {
		if (enabled) {
			return;
		}

		const existing = sessionsByRoom.get(room);
		if (!existing) {
			return;
		}

		sessionsByRoom.delete(room);
		attachedNotifiedRef.current = false;
		void disposeBoundSession(existing);
	}, [enabled, room]);

	return useMemo(
		() => ({
			...state,
			containerRef: setContainerRef,
			disconnect,
		}),
		[disconnect, setContainerRef, state],
	);
}

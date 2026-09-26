"use client";

import { useMaybeRoomContext } from "@livekit/components-react";
import type { AvatarView } from "@spatialwalk/avatarkit";
import type { AvatarPlayer } from "@spatialwalk/avatarkit-rtc";
import type { Room } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	createSharedRoomProvider,
	SHARED_ROOM_CREDENTIAL,
	waitForRoomConnected,
} from "@/components/saas/agents/spatialreal-avatar/shared-room-provider";
import type {
	SpatialRealAvatarConnectionStatus,
	SpatialRealAvatarState,
	UseSpatialRealAvatarOptions,
	UseSpatialRealAvatarResult,
} from "@/types/spatialreal-avatar";

/** The SDK touches WebGPU/WASM at import time, so it is only loaded in the browser. */
type AvatarKit = typeof import("@spatialwalk/avatarkit");

type SdkOptions = Pick<
	UseSpatialRealAvatarOptions,
	| "appId"
	| "characterApiBaseUrl"
	| "drivingServiceMode"
	| "environment"
	| "sdkLogLevel"
	| "sessionToken"
	| "userId"
>;

function toError(error: unknown, fallbackMessage: string) {
	return error instanceof Error ? error : new Error(fallbackMessage);
}

function sameSdkConfiguration(avatarkit: AvatarKit, options: SdkOptions) {
	const configuration = avatarkit.AvatarSDK.configuration;

	return (
		avatarkit.AvatarSDK.appId === options.appId &&
		configuration?.environment ===
			(options.environment ?? avatarkit.Environment.intl) &&
		configuration?.drivingServiceMode ===
			(options.drivingServiceMode ?? avatarkit.DrivingServiceMode.host) &&
		configuration?.characterApiBaseUrl === options.characterApiBaseUrl &&
		configuration?.logLevel === options.sdkLogLevel
	);
}

async function ensureAvatarSdk(avatarkit: AvatarKit, options: SdkOptions) {
	if (!avatarkit.AvatarSDK.isInitialized) {
		await avatarkit.AvatarSDK.initialize(options.appId, {
			characterApiBaseUrl: options.characterApiBaseUrl,
			drivingServiceMode:
				options.drivingServiceMode ?? avatarkit.DrivingServiceMode.host,
			environment: options.environment ?? avatarkit.Environment.intl,
			logLevel: options.sdkLogLevel,
		});
	} else if (!sameSdkConfiguration(avatarkit, options)) {
		throw new Error(
			"AvatarSDK is already initialized with a different configuration. Keep appId and SDK options stable across mounted SpatialReal avatars.",
		);
	}

	if (options.sessionToken) {
		avatarkit.AvatarSDK.setSessionToken(options.sessionToken);
	}

	if (options.userId) {
		avatarkit.AvatarSDK.setUserId(options.userId);
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

/**
 * Renders a SpatialReal avatar from the animation data track of an existing
 * LiveKit room. The room is owned by the caller (normally <LiveKitRoom>), which
 * also owns microphone/camera publishing and agent audio playback — this hook
 * only drives the avatar canvas.
 */
export function useSpatialRealAvatar(
	options: UseSpatialRealAvatarOptions,
): UseSpatialRealAvatarResult {
	const {
		appId,
		avatarId,
		characterApiBaseUrl,
		drivingServiceMode,
		enabled = true,
		environment,
		onAvatarError,
		onConnected,
		onDisconnected,
		onLoadProgress,
		onStateChange,
		playerOptions,
		room: roomOption,
		sdkLogLevel,
		sessionToken,
		userId,
	} = options;

	const contextRoom = useMaybeRoomContext();
	const room = roomOption ?? contextRoom ?? null;

	const [containerElement, setContainerElement] =
		useState<HTMLDivElement | null>(null);
	const [containerReady, setContainerReady] = useState(false);
	const [state, setState] = useState<SpatialRealAvatarState>(createIdleState);

	const avatarViewRef = useRef<AvatarView | null>(null);
	const playerRef = useRef<AvatarPlayer | null>(null);
	/**
	 * Teardown releases the animation receiver transform on the shared room, so
	 * the next connect has to wait for it — otherwise the new player installs
	 * its transform first and the old teardown pulls it straight back off.
	 */
	const teardownRef = useRef<Promise<void>>(Promise.resolve());
	const callbacksRef = useRef({
		onAvatarError,
		onConnected,
		onDisconnected,
		onLoadProgress,
		onStateChange,
		playerOptions,
	});

	useEffect(() => {
		callbacksRef.current = {
			onAvatarError,
			onConnected,
			onDisconnected,
			onLoadProgress,
			onStateChange,
			playerOptions,
		};
	}, [
		onAvatarError,
		onConnected,
		onDisconnected,
		onLoadProgress,
		onStateChange,
		playerOptions,
	]);

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

	const teardownInstance = useCallback(
		async (player: AvatarPlayer | null, view: AvatarView | null) => {
			if (playerRef.current === player) {
				playerRef.current = null;
			}

			if (avatarViewRef.current === view) {
				avatarViewRef.current = null;
			}

			try {
				// The shared provider nulls its room first, so this leaves the
				// caller-owned LiveKit room connected.
				await player?.disconnect();
			} catch {
				// Ignore teardown errors so unmounts stay predictable.
			}

			try {
				view?.dispose();
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
		const player = playerRef.current;
		const view = avatarViewRef.current;

		if (!player && !view) {
			setState(createIdleState());
			return;
		}

		updateStatus("disconnecting");
		await teardownInstance(player, view);
		setState(createIdleState());
	}, [teardownInstance, updateStatus]);

	const reconnect = useCallback(async () => {
		const player = playerRef.current;

		if (!player) {
			throw new Error("Avatar player is not ready yet.");
		}

		updateStatus("connecting");

		try {
			await player.reconnect();
			updateStatus("connected");
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

	// The canvas must have a non-zero box before the renderer attaches to it.
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
		if (!enabled || !room || !containerReady || !containerElement) {
			return;
		}

		const abort = new AbortController();
		const pendingTeardown = teardownRef.current;
		let player: AvatarPlayer | null = null;
		let view: AvatarView | null = null;

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

		const handleDisconnected = () => {
			if (abort.signal.aborted) {
				return;
			}

			setState(createIdleState());
			callbacksRef.current.onStateChange?.("idle");
			callbacksRef.current.onDisconnected?.();
		};

		const handleStalled = async () => {
			if (abort.signal.aborted || !player) {
				return;
			}

			try {
				await player.reconnect();
				if (!abort.signal.aborted) {
					updateStatus("connected");
				}
			} catch (error) {
				handleError(
					toError(
						error,
						"Avatar stream stalled and could not reconnect.",
					),
				);
			}
		};

		const cleanupHandlers = () => {
			if (!player) {
				return;
			}

			player.off("disconnected", handleDisconnected);
			player.off("error", handleError);
			player.off("stalled", handleStalled);
		};

		async function connectAvatar(
			container: HTMLDivElement,
			activeRoom: Room,
		) {
			updateStatus("initializing", activeRoom);
			setState((previous) => ({
				...previous,
				downloadProgress: null,
				error: null,
			}));

			await pendingTeardown;
			if (abort.signal.aborted) {
				return;
			}

			const [avatarkit, { AvatarPlayer: Player }] = await Promise.all([
				import("@spatialwalk/avatarkit"),
				import("@spatialwalk/avatarkit-rtc"),
			]);
			if (abort.signal.aborted) {
				return;
			}

			await ensureAvatarSdk(avatarkit, {
				appId,
				characterApiBaseUrl,
				drivingServiceMode,
				environment,
				sdkLogLevel,
				sessionToken,
				userId,
			});
			if (abort.signal.aborted) {
				return;
			}

			const avatar = await avatarkit.AvatarManager.shared.load(
				avatarId,
				(progress) => {
					callbacksRef.current.onLoadProgress?.(progress);

					setState((previous) => ({
						...previous,
						downloadProgress:
							progress.type === avatarkit.LoadProgress.downloading
								? (progress.progress ?? null)
								: progress.type ===
										avatarkit.LoadProgress.completed
									? 1
									: previous.downloadProgress,
					}));
				},
			);
			if (abort.signal.aborted) {
				return;
			}

			view = new avatarkit.AvatarView(avatar, container);
			avatarViewRef.current = view;

			const provider = await createSharedRoomProvider(activeRoom);
			await waitForRoomConnected(activeRoom, abort.signal);
			// From here the view exists, so an abort has to dispose it: the
			// effect cleanup already ran with nothing to tear down.
			if (abort.signal.aborted) {
				await teardownInstance(null, view);
				return;
			}

			updateStatus("connecting", activeRoom);
			player = new Player(
				provider,
				view,
				callbacksRef.current.playerOptions ?? { logLevel: "warning" },
			);
			playerRef.current = player;
			player.on("disconnected", handleDisconnected);
			player.on("error", handleError);
			player.on("stalled", handleStalled);

			await player.connect({
				url: SHARED_ROOM_CREDENTIAL,
				token: SHARED_ROOM_CREDENTIAL,
				roomName: activeRoom.name,
			});
			if (abort.signal.aborted) {
				cleanupHandlers();
				await teardownInstance(player, view);
				return;
			}

			updateStatus("connected", activeRoom);
			callbacksRef.current.onConnected?.(activeRoom);
		}

		void connectAvatar(containerElement, room).catch((error: unknown) => {
			if (!abort.signal.aborted) {
				handleError(toError(error, "Failed to initialize avatar."));
			}
			cleanupHandlers();
			teardownRef.current = teardownInstance(player, view);
		});

		return () => {
			abort.abort();
			cleanupHandlers();
			setState(createIdleState());
			teardownRef.current = teardownInstance(player, view);
		};
	}, [
		appId,
		avatarId,
		characterApiBaseUrl,
		containerElement,
		containerReady,
		drivingServiceMode,
		enabled,
		environment,
		room,
		sdkLogLevel,
		sessionToken,
		teardownInstance,
		updateStatus,
		userId,
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

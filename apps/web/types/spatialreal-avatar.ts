import type {
	LogLevel as AvatarSdkLogLevel,
	DrivingServiceMode,
	Environment,
	LoadProgressInfo,
} from "@spatialwalk/avatarkit";
import type { AvatarPlayerOptions } from "@spatialwalk/avatarkit-rtc";
import type { Room } from "livekit-client";

export type SpatialRealAvatarConnectionStatus =
	| "idle"
	| "initializing"
	| "connecting"
	| "connected"
	| "disconnecting"
	| "error";

interface SpatialRealAvatarSdkOptions {
	appId: string;
	avatarId: string;
	characterApiBaseUrl?: string;
	drivingServiceMode?: DrivingServiceMode;
	environment?: Environment;
	sessionToken?: string;
	sdkLogLevel?: AvatarSdkLogLevel;
	userId?: string;
}

export interface UseSpatialRealAvatarOptions
	extends SpatialRealAvatarSdkOptions {
	/**
	 * LiveKit room carrying the avatar animation track. Defaults to the room
	 * provided by <LiveKitRoom>. The avatar attaches to this room — it never
	 * creates or disconnects one — so the same session drives a SpatialReal
	 * canvas and a provider-published avatar video track alike.
	 */
	room?: Room | null;
	enabled?: boolean;
	onAvatarError?: (error: Error) => void;
	onConnected?: (room: Room) => void;
	onDisconnected?: () => void;
	onLoadProgress?: (progress: LoadProgressInfo) => void;
	onStateChange?: (status: SpatialRealAvatarConnectionStatus) => void;
	playerOptions?: AvatarPlayerOptions;
}

export interface SpatialRealAvatarState {
	downloadProgress: number | null;
	error: Error | null;
	isConnected: boolean;
	isLoading: boolean;
	room: Room | null;
	status: SpatialRealAvatarConnectionStatus;
}

export interface UseSpatialRealAvatarResult extends SpatialRealAvatarState {
	containerRef: (node: HTMLDivElement | null) => void;
	disconnect: () => Promise<void>;
	reconnect: () => Promise<void>;
}

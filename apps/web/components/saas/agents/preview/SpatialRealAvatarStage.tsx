"use client";

import { cn } from "@repo/ui/utils";
import type { Room } from "livekit-client";
import { AlertTriangle } from "lucide-react";
import {
	SpatialRealAvatarCanvas,
	SpatialRealAvatarError,
	SpatialRealAvatarFrame,
	SpatialRealAvatarLoading,
	SpatialRealAvatarProvider,
} from "@/components/saas/agents/spatialreal-avatar";

/**
 * SpatialReal avatars render client-side via a subscribe-only LiveKit
 * participant while the session room (mic, proctoring, chrome) stays on
 * <LiveKitRoom>.
 */
export default function SpatialRealAvatarStage({
	room,
	appId,
	sessionToken,
	rendererToken,
	serverUrl,
	avatarId,
	compact = false,
	className,
}: {
	/** Defaults to the room from <LiveKitRoom>; used only as a connect gate. */
	room?: Room | null;
	/** Served by the session-start API from the server-only SPATIALREAL_APP_ID. */
	appId?: string | null;
	/** SpatialReal session token minted server-side with SPATIALREAL_API_KEY. */
	sessionToken?: string | null;
	/** LiveKit token for the subscribe-only renderer identity. */
	rendererToken?: string | null;
	serverUrl?: string | null;
	avatarId: string;
	/** Compact loading chrome for PiP / small stages. */
	compact?: boolean;
	className?: string;
}) {
	const resolvedAvatarId = avatarId;
	if (
		!appId ||
		!resolvedAvatarId ||
		!sessionToken ||
		!rendererToken ||
		!serverUrl
	) {
		return (
			<div
				className={cn(
					"flex size-full flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center",
					className,
				)}
			>
				<AlertTriangle className="size-5 text-amber-400" />
				<p className="text-sm text-white/90">Avatar not configured</p>
				<p className="text-xs text-white/60">
					Set SPATIALREAL_APP_ID and SPATIALREAL_API_KEY on the server
					and select a SpatialReal avatar for this agent.
				</p>
			</div>
		);
	}

	return (
		<SpatialRealAvatarProvider
			appId={appId}
			avatarId={resolvedAvatarId}
			sessionToken={sessionToken}
			rendererToken={rendererToken}
			serverUrl={serverUrl}
			room={room}
		>
			<SpatialRealAvatarFrame
				tone="ghost"
				className={cn(
					"size-full rounded-none border-0 bg-transparent shadow-none",
					className,
				)}
			>
				<SpatialRealAvatarCanvas
					className="size-full"
					minHeight="100%"
				/>
				<SpatialRealAvatarLoading
					className={compact ? "bg-background/70 p-0 backdrop-blur-sm" : undefined}
				>
					{compact ? (
						<div className="size-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
					) : undefined}
				</SpatialRealAvatarLoading>
				<SpatialRealAvatarError />
			</SpatialRealAvatarFrame>
		</SpatialRealAvatarProvider>
	);
}

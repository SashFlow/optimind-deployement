"use client";

import { cn } from "@repo/ui/utils";
import type { Room } from "livekit-client";
import { AlertTriangle } from "lucide-react";
import {
	SpatialRealAvatarCanvas,
	SpatialRealAvatarError,
	SpatialRealAvatarFrame,
	SpatialRealAvatarProvider,
} from "@/components/saas/agents/spatialreal-avatar";

/**
 * SpatialReal avatars render client-side from an animation data track on the
 * session room, so they share the session that a provider-published avatar
 * video track would use — same room, same mic, same agent audio.
 */
export default function SpatialRealAvatarStage({
	room,
	avatarId,
	className,
}: {
	/** Defaults to the room from <LiveKitRoom>. */
	room?: Room | null;
	/** SpatialReal avatar id; falls back to NEXT_PUBLIC_SPATIALREAL_AVATAR_ID. */
	avatarId?: string | null;
	className?: string;
}) {
	const appId = process.env.NEXT_PUBLIC_SPATIALREAL_APP_ID;
	const resolvedAvatarId = avatarId

	if (!appId || !resolvedAvatarId) {
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
					Set NEXT_PUBLIC_SPATIALREAL_APP_ID and select a SpatialReal
					avatar for this agent.
				</p>
			</div>
		);
	}

	return (
		<SpatialRealAvatarProvider
			appId={appId}
			avatarId={resolvedAvatarId}
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
				<SpatialRealAvatarError />
			</SpatialRealAvatarFrame>
		</SpatialRealAvatarProvider>
	);
}

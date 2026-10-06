"use client";

import { cn } from "@repo/ui/utils";
import type { Room } from "livekit-client";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import {
	SpatiusAvatarCanvas,
	SpatiusAvatarError,
	SpatiusAvatarFrame,
	SpatiusAvatarLoading,
	SpatiusAvatarProvider,
} from "@/components/saas/agents/spatius-avatar";

/**
 * Spatius avatars render client-side via AvatarKit attached to the host
 * LiveKit room (motion is carried in otherwise-black video frames).
 *
 * @see https://docs.spatius.ai/livekit-agents/client
 */
export default function SpatiusAvatarStage({
	room,
	appId,
	avatarId,
	compact = false,
	className,
	onAttached,
}: {
	room: Room;
	/** Served by the session-start API from the server-only SPATIUS_APP_ID. */
	appId?: string | null;
	avatarId: string;
	compact?: boolean;
	className?: string;
	/** Unlock LiveKitRoom connect after AvatarKit has attached (or failed). */
	onAttached?: () => void;
}) {
	const configured = Boolean(appId && avatarId);

	useEffect(() => {
		if (!configured) {
			onAttached?.();
		}
	}, [configured, onAttached]);

	if (!configured || !appId) {
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
					Set SPATIUS_APP_ID on the server and select a Spatius avatar
					for this agent.
				</p>
			</div>
		);
	}

	return (
		<SpatiusAvatarProvider
			appId={appId}
			avatarId={avatarId}
			room={room}
			onAttached={onAttached}
		>
			<SpatiusAvatarFrame
				tone="ghost"
				className={cn(
					"size-full rounded-none border-0 bg-transparent shadow-none",
					className,
				)}
			>
				<SpatiusAvatarCanvas className="size-full" minHeight="100%" />
				<SpatiusAvatarLoading
					className={
						compact
							? "bg-background/70 p-0 backdrop-blur-sm"
							: undefined
					}
				>
					{compact ? (
						<div className="size-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
					) : undefined}
				</SpatiusAvatarLoading>
				<SpatiusAvatarError />
			</SpatiusAvatarFrame>
		</SpatiusAvatarProvider>
	);
}

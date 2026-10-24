"use client";

import { cn } from "@repo/ui/utils";
import type { Room } from "livekit-client";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
	DEFAULT_GSPLAT_CAMERA,
	DEFAULT_GSPLAT_FRAME,
	GsplatViewport,
} from "@/components/saas/agents/gsplat-avatar";
import { useGsplatLipsync } from "@/hooks/useGsplatLipsync";

/**
 * Client-rendered 3DGS avatar with ARKit lipsync driven by LiveKit
 * `avatar.lipsync` data packets (same contract as the avatar LivePage).
 */
export default function GsplatAvatarStage({
	room,
	avatarId = "avatar",
	compact = false,
	className,
}: {
	room: Room;
	avatarId?: string;
	compact?: boolean;
	className?: string;
}) {
	const { engine, audioRef, getTime } = useGsplatLipsync(room);
	const [status, setStatus] = useState<string | null>(null);
	const failed = Boolean(status?.startsWith("renderer failed"));

	if (failed) {
		return (
			<div
				className={cn(
					"flex size-full flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center",
					className,
				)}
			>
				<AlertTriangle className="size-5 text-amber-400" />
				<p className="text-sm text-white/90">Avatar failed to load</p>
				{!compact ? (
					<p className="text-xs text-white/60">
						Ensure COOP/COEP isolation is enabled and the avatar zip
						under <code className="text-white/80">/gsplat/</code> is
						present.
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className={cn("relative size-full min-h-0 bg-white", className)}>
			<GsplatViewport
				engine={engine}
				avatarId={avatarId}
				audioRef={audioRef}
				getTime={getTime}
				driveEngine
				camera={DEFAULT_GSPLAT_CAMERA}
				frame={DEFAULT_GSPLAT_FRAME}
				frontalOnly
				className="size-full"
				onStatus={setStatus}
			/>
		</div>
	);
}

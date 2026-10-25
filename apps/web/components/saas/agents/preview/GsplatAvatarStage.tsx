"use client";

import { cn } from "@repo/ui/utils";
import type { Room } from "livekit-client";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { OptiModelViewport } from "@/components/saas/agents/optimodel-avatar/OptiModelViewport";
import { useGsplatLipsync } from "@/hooks/useGsplatLipsync";

/**
 * Client-rendered OptiModel (SpatialReal) avatar with ARKit→FLAME lipsync
 * driven by LiveKit `avatar.lipsync` data packets.
 */
export default function GsplatAvatarStage({
	room,
	avatarId = "samira",
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
						Ensure the SpatialReal pack under{" "}
						<code className="text-white/80">
							/spatialreal/avatars/
						</code>{" "}
						is present and COOP/COEP isolation is enabled.
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className={cn("relative size-full min-h-0 bg-white", className)}>
			<OptiModelViewport
				engine={engine}
				avatarId={avatarId}
				audioRef={audioRef}
				getTime={getTime}
				driveEngine
				className="size-full"
				onStatus={setStatus}
			/>
		</div>
	);
}

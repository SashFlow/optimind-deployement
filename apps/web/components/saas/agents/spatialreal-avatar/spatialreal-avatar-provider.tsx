"use client";

import type { ReactNode } from "react";
import { SpatialRealAvatarContext } from "@/components/saas/agents/spatialreal-avatar/spatialreal-avatar-context";
import { useSpatialRealAvatar } from "@/hooks/useSpatialRealAvatar";
import type { UseSpatialRealAvatarOptions } from "@/types/spatialreal-avatar";

export interface SpatialRealAvatarProviderProps
	extends UseSpatialRealAvatarOptions {
	children: ReactNode;
}

/**
 * Drives a SpatialReal LiveKit avatar session and exposes its state to
 * <SpatialRealAvatarCanvas>, <SpatialRealAvatarLoading> and friends.
 *
 * Session concerns — connecting the user room, publishing the microphone —
 * belong to the host (<LiveKitRoom>). The avatar joins as a subscribe-only
 * renderer participant; its audio is played by the SpatialReal SDK.
 */
export function SpatialRealAvatarProvider({
	children,
	...options
}: SpatialRealAvatarProviderProps) {
	const avatar = useSpatialRealAvatar(options);

	return (
		<SpatialRealAvatarContext.Provider value={avatar}>
			{children}
		</SpatialRealAvatarContext.Provider>
	);
}

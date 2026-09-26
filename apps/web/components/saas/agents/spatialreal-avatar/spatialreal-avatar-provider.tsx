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
 * Drives a SpatialReal avatar from the surrounding LiveKit room and exposes its
 * state to <SpatialRealAvatarCanvas>, <SpatialRealAvatarLoading> and friends.
 *
 * Session concerns — connecting the room, publishing the microphone, playing
 * agent audio — belong to the host (<LiveKitRoom>), not to the avatar.
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

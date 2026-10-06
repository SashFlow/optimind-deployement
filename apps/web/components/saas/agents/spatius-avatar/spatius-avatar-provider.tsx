"use client";

import type { ReactNode } from "react";
import { SpatiusAvatarContext } from "@/components/saas/agents/spatius-avatar/spatius-avatar-context";
import { useSpatiusAvatar } from "@/hooks/useSpatiusAvatar";
import type { UseSpatiusAvatarOptions } from "@/types/spatius-avatar";

export interface SpatiusAvatarProviderProps extends UseSpatiusAvatarOptions {
	children: ReactNode;
}

/**
 * Drives Spatius AvatarKit on a host-owned LiveKit room and exposes state to
 * canvas / loading / error children. Mic publish and remote audio stay on
 * <LiveKitRoom> — this only attaches the RTC adapter for motion decode.
 */
export function SpatiusAvatarProvider({
	children,
	...options
}: SpatiusAvatarProviderProps) {
	const avatar = useSpatiusAvatar(options);

	return (
		<SpatiusAvatarContext.Provider value={avatar}>
			{children}
		</SpatiusAvatarContext.Provider>
	);
}

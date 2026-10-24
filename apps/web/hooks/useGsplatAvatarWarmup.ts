"use client";

import { useEffect } from "react";
import { warmGsplatAvatar } from "@/lib/gsplat-preload";

/**
 * Best-effort 3DGS (arkit) warm during the prejoin / preview lobby:
 * 1. Install a shared `/gsplat/*.zip` fetch cache (memory + Cache API)
 * 2. Start downloading the avatar zip immediately
 * 3. Preload `@myned-ai/gsplat-flame-avatar-renderer` so Join mounts fast
 *
 * Scope: preview window only — call from configure / embed / share prejoin.
 */
export function useGsplatAvatarWarmup(options: {
	enabled: boolean;
	avatarId: string | null | undefined;
}) {
	const { enabled, avatarId } = options;

	useEffect(() => {
		if (!enabled || !avatarId) {
			return;
		}
		warmGsplatAvatar(avatarId);
	}, [enabled, avatarId]);
}

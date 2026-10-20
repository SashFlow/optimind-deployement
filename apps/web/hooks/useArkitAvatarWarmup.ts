"use client";

import { useEffect } from "react";
import { getArkitZipUrl } from "@/lib/arkit-avatars";
import { preloadArkitZip } from "@/lib/arkit-avatar-preload";

/**
 * Best-effort 3DGS ZIP warm during the prejoin / preview lobby so Join
 * does not block on downloading the splat asset.
 */
export function useArkitAvatarWarmup(options: {
	enabled: boolean;
	avatarId: string | null | undefined;
}) {
	const { enabled, avatarId } = options;

	useEffect(() => {
		if (!enabled || !avatarId) {
			return;
		}
		const url = getArkitZipUrl(avatarId);
		if (!url) {
			return;
		}
		void preloadArkitZip(url).catch((err) => {
			console.warn("ARKit avatar ZIP preload failed", err);
		});
	}, [enabled, avatarId]);
}

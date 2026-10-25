"use client";

import { useEffect } from "react";
import { warmGsplatAvatar } from "@/lib/gsplat-preload";

/**
 * Best-effort OptiModel warm during the prejoin / preview lobby:
 * 1. Install a shared `/spatialreal/*` fetch cache (memory + Cache API)
 * 2. Prefetch the SpatialReal pack (shape / ply / idle / character)
 * 3. Initialize `@spatius/avatarkit` host mode + `AvatarManager.load`
 *
 * Join awaits the same gate via `waitForOptiModelWarmupIdle` so the viewport
 * mounts on already-cached bytes instead of downloading post-connect.
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

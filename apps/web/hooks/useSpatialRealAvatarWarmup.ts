"use client";

import { useEffect } from "react";
import {
	preloadSpatialRealSdk,
	runSpatialRealWarmup,
} from "@/lib/spatialreal-preload";

/**
 * Best-effort SpatialReal SDK/WASM warm during the prejoin lobby.
 * Only preloads the module — does not createSession (that races Join and can
 * leave the live LiveKit avatar session stuck connecting with no audio).
 */
export function useSpatialRealAvatarWarmup(options: {
	enabled: boolean;
	avatarId: string | null | undefined;
}) {
	const { enabled, avatarId } = options;

	useEffect(() => {
		if (!enabled || !avatarId) {
			return;
		}

		void runSpatialRealWarmup(async () => {
			await preloadSpatialRealSdk();
		});
	}, [enabled, avatarId]);
}

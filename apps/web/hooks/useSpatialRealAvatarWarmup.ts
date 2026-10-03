"use client";

import { useEffect, useRef } from "react";
import {
	installSpatialRealBaseModelCache,
	prefetchSpatialRealBaseModel,
	preloadSpatialRealSdk,
	runSpatialRealWarmup,
	warmSpatialRealRuntime,
} from "@/lib/spatialreal-preload";

export type SpatialRealWarmupCredentialsFetcher = () => Promise<{
	spatialRealAppId: string | null;
	spatialRealSessionToken: string | null;
} | null>;

/**
 * Best-effort SpatialReal warm during the prejoin / preview lobby:
 * 1. Install a shared base_model fetch cache (memory + Cache API)
 * 2. Start downloading base_model.pb.gz immediately
 * 3. Mint warmup credentials and AvatarSDK.initialize
 * 4. Optionally cache the avatar character via AvatarManager.load
 *
 * Does not createSession (that races Join and can leave the live LiveKit avatar
 * session stuck connecting with no audio).
 */
export function useSpatialRealAvatarWarmup(options: {
	enabled: boolean;
	avatarId: string | null | undefined;
	fetchCredentials?: SpatialRealWarmupCredentialsFetcher;
}) {
	const { enabled, avatarId, fetchCredentials } = options;
	const fetchCredentialsRef = useRef(fetchCredentials);

	useEffect(() => {
		fetchCredentialsRef.current = fetchCredentials;
	}, [fetchCredentials]);

	useEffect(() => {
		if (!enabled || !avatarId) {
			return;
		}

		void runSpatialRealWarmup(async () => {
			installSpatialRealBaseModelCache();
			// Start the large CDN download immediately; credentials can follow.
			prefetchSpatialRealBaseModel();
			await preloadSpatialRealSdk();

			const fetchCredentialsFn = fetchCredentialsRef.current;
			if (!fetchCredentialsFn) {
				return;
			}

			const credentials = await fetchCredentialsFn().catch(() => null);
			const appId = credentials?.spatialRealAppId;
			if (!appId) {
				return;
			}

			await warmSpatialRealRuntime({
				appId,
				sessionToken: credentials.spatialRealSessionToken,
				avatarId,
			});
		});
	}, [enabled, avatarId]);
}

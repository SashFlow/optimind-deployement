type SpatiusAvatarKit = typeof import("@spatius/avatarkit");
type SpatiusAvatarKitRtc = typeof import("@spatius/avatarkit-rtc");

export type SpatiusSdk = {
	AvatarSDK: SpatiusAvatarKit["AvatarSDK"];
	AvatarManager: SpatiusAvatarKit["AvatarManager"];
	AvatarView: SpatiusAvatarKit["AvatarView"];
	DrivingServiceMode: SpatiusAvatarKit["DrivingServiceMode"];
	AvatarPlayer: SpatiusAvatarKitRtc["AvatarPlayer"];
	LiveKitProvider: SpatiusAvatarKitRtc["LiveKitProvider"];
};

let sdkPromise: Promise<SpatiusSdk> | null = null;
let initPromise: Promise<void> | null = null;
let initializedAppId: string | null = null;

export function preloadSpatiusSdk(): Promise<SpatiusSdk> {
	if (!sdkPromise) {
		sdkPromise = Promise.all([
			import("@spatius/avatarkit"),
			import("@spatius/avatarkit-rtc"),
		]).then(([avatarkit, rtc]) => ({
			AvatarSDK: avatarkit.AvatarSDK,
			AvatarManager: avatarkit.AvatarManager,
			AvatarView: avatarkit.AvatarView,
			DrivingServiceMode: avatarkit.DrivingServiceMode,
			AvatarPlayer: rtc.AvatarPlayer,
			LiveKitProvider: rtc.LiveKitProvider,
		}));
	}
	return sdkPromise;
}

/**
 * Initialize AvatarKit once per app id in RTC mode (required before AvatarPlayer).
 */
export async function ensureSpatiusInitialized(
	appId: string,
): Promise<SpatiusSdk> {
	const sdk = await preloadSpatiusSdk();
	if (initializedAppId === appId && initPromise) {
		await initPromise;
		return sdk;
	}

	initializedAppId = appId;
	initPromise = sdk.AvatarSDK.initialize(appId, {
		drivingServiceMode: sdk.DrivingServiceMode.rtc,
	});
	await initPromise;
	return sdk;
}

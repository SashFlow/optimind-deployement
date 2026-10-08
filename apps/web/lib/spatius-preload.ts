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

export type SpatiusDrivingMode = "rtc" | "backend" | "direct";

export type SpatiusInitOptions = {
	drivingServiceMode?: SpatiusDrivingMode;
};

type InitCacheKey = string;

let sdkPromise: Promise<SpatiusSdk> | null = null;
let initPromise: Promise<void> | null = null;
let initCacheKey: InitCacheKey | null = null;

function resolveMode(
	sdk: SpatiusSdk,
	mode: SpatiusDrivingMode | undefined,
): SpatiusAvatarKit["DrivingServiceMode"] {
	if (mode === "backend") {
		return sdk.DrivingServiceMode.backend;
	}
	if (mode === "direct") {
		return sdk.DrivingServiceMode.direct;
	}
	return sdk.DrivingServiceMode.rtc;
}

function cacheKey(appId: string, options?: SpatiusInitOptions): InitCacheKey {
	return `${appId}|${options?.drivingServiceMode ?? "rtc"}`;
}

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
 * Initialize AvatarKit once per (appId, drivingServiceMode).
 * Defaults to RTC mode (required before AvatarPlayer).
 */
export async function ensureSpatiusInitialized(
	appId: string,
	options?: SpatiusInitOptions,
): Promise<SpatiusSdk> {
	const sdk = await preloadSpatiusSdk();
	const key = cacheKey(appId, options);
	if (initCacheKey === key && initPromise) {
		await initPromise;
		return sdk;
	}

	initCacheKey = key;
	initPromise = sdk.AvatarSDK.initialize(appId, {
		drivingServiceMode: resolveMode(sdk, options?.drivingServiceMode),
	});
	await initPromise;
	return sdk;
}

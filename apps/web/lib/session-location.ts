/** Browser geolocation captured once in the prejoin lobby. */
export type SessionLocation = {
	latitude: number;
	longitude: number;
	/** Accuracy in meters when the browser provides it. */
	accuracy: number | null;
	/** ISO timestamp when the position was read. */
	capturedAt: string;
};

export type LocationPermissionStatus =
	| "idle"
	| "requesting"
	| "granted"
	| "denied"
	| "unavailable";

/** Merge a prejoin location into contactMetadata for session start / dispatch. */
export function withLocationMetadata(
	contactMetadata: Record<string, unknown>,
	location: SessionLocation | null | undefined,
): Record<string, unknown> {
	if (!location) {
		return contactMetadata;
	}
	return {
		...contactMetadata,
		location: {
			latitude: location.latitude,
			longitude: location.longitude,
			accuracy: location.accuracy,
			capturedAt: location.capturedAt,
		},
	};
}

/** Request the current position once (must be called from a user gesture). */
export function requestSessionLocation(): Promise<SessionLocation> {
	return new Promise((resolve, reject) => {
		if (
			typeof navigator === "undefined" ||
			!navigator.geolocation ||
			typeof navigator.geolocation.getCurrentPosition !== "function"
		) {
			reject(new Error("Geolocation is not available in this browser."));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy:
						typeof position.coords.accuracy === "number"
							? position.coords.accuracy
							: null,
					capturedAt: new Date().toISOString(),
				});
			},
			(error) => {
				reject(
					new Error(
						error.message ||
							"Location permission was denied or unavailable.",
					),
				);
			},
			{
				enableHighAccuracy: false,
				timeout: 15_000,
				maximumAge: 60_000,
			},
		);
	});
}

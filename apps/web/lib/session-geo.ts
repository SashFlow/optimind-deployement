export type SessionGeoStatus = "granted" | "denied" | "unavailable" | "skipped";

export type SessionGeoPayload = {
	latitude?: number;
	longitude?: number;
	accuracy?: number;
	capturedAt: string;
	status: SessionGeoStatus;
};

export type SessionGeoTaggingMode = "disabled" | "optional" | "mandatory";

/** Capture browser geolocation for prejoin. Never throws — returns a status payload. */
export async function requestSessionGeo(
	mode: SessionGeoTaggingMode,
): Promise<SessionGeoPayload | undefined> {
	if (mode === "disabled") {
		return undefined;
	}

	if (typeof navigator === "undefined" || !navigator.geolocation) {
		return {
			capturedAt: new Date().toISOString(),
			status: "unavailable",
		};
	}

	try {
		const position = await new Promise<GeolocationPosition>(
			(resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: false,
					timeout: 15_000,
					maximumAge: 60_000,
				});
			},
		);
		return {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
			accuracy:
				typeof position.coords.accuracy === "number"
					? position.coords.accuracy
					: undefined,
			capturedAt: new Date().toISOString(),
			status: "granted",
		};
	} catch (error) {
		const code =
			error && typeof error === "object" && "code" in error
				? (error as GeolocationPositionError).code
				: null;
		const status: SessionGeoStatus =
			code === 1 /* PERMISSION_DENIED */ ? "denied" : "unavailable";
		return {
			capturedAt: new Date().toISOString(),
			status,
		};
	}
}

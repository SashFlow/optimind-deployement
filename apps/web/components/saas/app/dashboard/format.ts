export function formatDurationMs(ms: number | null | undefined): string {
	if (ms == null || ms <= 0) return "0 secs";
	const totalSecs = Math.floor(ms / 1000);
	if (totalSecs < 60) return `${totalSecs} secs`;
	const mins = Math.floor(totalSecs / 60);
	if (mins < 60) return `${mins} mins`;
	const hours = Math.floor(mins / 60);
	const remMins = mins % 60;
	return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function formatMinutes(minutes: number | null | undefined): string {
	if (minutes == null || minutes <= 0) return "0 secs";
	if (minutes < 1) {
		const secs = Math.round(minutes * 60);
		return `${secs} secs`;
	}
	const whole = Math.round(minutes);
	return `${whole} mins`;
}

export function formatBytes(bytes: number | null | undefined): string {
	if (bytes == null || bytes <= 0) return "0 byte";
	const units = ["byte", "KB", "MB", "GB", "TB"] as const;
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const rounded =
		unit === 0
			? String(Math.round(value))
			: value.toFixed(value >= 10 ? 1 : 2);
	const label = units[unit];
	if (unit === 0 && Math.round(value) !== 1) return `${rounded} bytes`;
	return `${rounded} ${label}`;
}

export function shortDateLabel(isoDate: string): string {
	// YYYY-MM-DD -> MM-DD or locale-ish short
	if (isoDate.length >= 10) return isoDate.slice(5);
	return isoDate;
}

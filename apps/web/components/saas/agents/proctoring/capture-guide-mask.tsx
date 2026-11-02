"use client";

type GuideRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type GuideTone = "idle" | "adjusting" | "ready";

const TONE_STROKE: Record<GuideTone, string> = {
	idle: "rgba(255,255,255,0.92)",
	adjusting: "rgb(251, 191, 36)",
	ready: "rgb(52, 211, 153)",
};

/** Soft face oval in a 100×130 box (narrower toward the chin). */
const FACE_OVAL_PATH =
	"M50 4 C78 4 94 28 94 58 C94 92 74 126 50 126 C26 126 6 92 6 58 C6 28 22 4 50 4 Z";

/**
 * Full-body silhouette in a 100×220 box.
 * Head, shoulders, torso, arms slightly out, legs.
 */
const BODY_SILHOUETTE_PATH = [
	"M50 8",
	"C64 8 75 20 75 36",
	"C75 52 64 64 50 64",
	"C36 64 25 52 25 36",
	"C25 20 36 8 50 8",
	"Z",
	"M42 64",
	"L42 72",
	"C28 74 14 82 10 96",
	"C6 110 8 128 14 148",
	"C16 156 22 158 28 154",
	"L34 122",
	"L36 206",
	"C37 214 42 218 48 216",
	"L50 168",
	"L52 216",
	"C58 218 63 214 64 206",
	"L66 122",
	"L72 154",
	"C78 158 84 156 86 148",
	"C92 128 94 110 90 96",
	"C86 82 72 74 58 72",
	"L58 64",
	"Z",
].join(" ");

function pct(value: number) {
	return `${value * 100}%`;
}

function maskDataUri(innerSvg: string) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="white"/>${innerSvg}</svg>`;
	return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** Face-shaped oval cutout with dimmed surroundings. */
export function FaceGuideMask({
	guide,
	tone,
}: {
	guide: GuideRect;
	tone: GuideTone;
}) {
	const stroke = TONE_STROKE[tone];
	const hole = `<svg x="${guide.x * 100}" y="${guide.y * 100}" width="${guide.width * 100}" height="${guide.height * 100}" viewBox="0 0 100 130" preserveAspectRatio="none"><path d="${FACE_OVAL_PATH}" fill="black"/></svg>`;
	const mask = maskDataUri(hole);

	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-black/50"
				style={{
					WebkitMaskImage: mask,
					maskImage: mask,
					WebkitMaskSize: "100% 100%",
					maskSize: "100% 100%",
					WebkitMaskRepeat: "no-repeat",
					maskRepeat: "no-repeat",
				}}
			/>
			<svg
				aria-hidden
				className="pointer-events-none absolute"
				style={{
					left: pct(guide.x),
					top: pct(guide.y),
					width: pct(guide.width),
					height: pct(guide.height),
				}}
				viewBox="0 0 100 130"
				preserveAspectRatio="none"
			>
				<title>Face alignment guide</title>
				<path
					d={FACE_OVAL_PATH}
					fill="none"
					stroke={stroke}
					strokeWidth="2.75"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</>
	);
}

/** Full-body silhouette cutout aligned to the body guide. */
export function BodyGuideMask({
	guide,
	tone,
}: {
	guide: GuideRect;
	tone: GuideTone;
}) {
	const stroke = TONE_STROKE[tone];
	const hole = `<svg x="${guide.x * 100}" y="${guide.y * 100}" width="${guide.width * 100}" height="${guide.height * 100}" viewBox="0 0 100 220" preserveAspectRatio="none"><path d="${BODY_SILHOUETTE_PATH}" fill="black"/></svg>`;
	const mask = maskDataUri(hole);

	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-black/50"
				style={{
					WebkitMaskImage: mask,
					maskImage: mask,
					WebkitMaskSize: "100% 100%",
					maskSize: "100% 100%",
					WebkitMaskRepeat: "no-repeat",
					maskRepeat: "no-repeat",
				}}
			/>
			<svg
				aria-hidden
				className="pointer-events-none absolute"
				style={{
					left: pct(guide.x),
					top: pct(guide.y),
					width: pct(guide.width),
					height: pct(guide.height),
				}}
				viewBox="0 0 100 220"
				preserveAspectRatio="none"
			>
				<title>Body alignment guide</title>
				<path
					d={BODY_SILHOUETTE_PATH}
					fill="none"
					stroke={stroke}
					strokeWidth="2.75"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</>
	);
}

export function captureGuideTone(args: {
	detected?: boolean;
	found?: boolean;
}): GuideTone {
	if (args.detected) {
		return "ready";
	}
	if (args.found) {
		return "adjusting";
	}
	return "idle";
}

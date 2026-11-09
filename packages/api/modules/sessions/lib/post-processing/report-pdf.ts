import PDFDocument from "pdfkit";
import { REPORT_LOGO_PNG } from "./report-logo";
import type { PostProcessingResult, TimedMediaFinding } from "./types";

/* -------------------------------------------------------------------------- */
/*  Brand                                                                     */
/*  Optimind by Sashflow. Tweak the hex values here to match brand guidelines */
/* -------------------------------------------------------------------------- */

export const BRAND = {
	name: "Optimind",
	byline: "by Sashflow",
	company: "Sashflow Technologies Private Limited",
	website: "app.sashflow.com",
	ink: "#0B1220",
	primary: "#4F46E5",
	primarySoft: "#EEF0FF",
	text: "#111827",
	muted: "#6B7280",
	border: "#E5E7EB",
	surface: "#F8FAFC",
	good: "#047857",
	goodSoft: "#D1FAE5",
	warn: "#B45309",
	warnSoft: "#FEF3C7",
	bad: "#B91C1C",
	badSoft: "#FEE2E2",
	neutral: "#374151",
	neutralSoft: "#F3F4F6",
} as const;

const PAGE_MARGIN = 40;
const HEADER_H = 52;
const TOP_MARGIN = 76;
const BOTTOM_MARGIN = 56;
const CARD_PAD = 14;
const IMAGE_COL_W = 180;
const COL_GAP = 16;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ReportImageKind = "face" | "id" | "body" | "other";

export type ReportImage = {
	kind: ReportImageKind;
	label: string;
	bytes: Buffer;
	mimeType?: string;
};

export type UserResponseEntry = {
	question: string;
	answer: unknown;
	key?: string;
	label?: string;
};

export type ReportTranscriptSegment = {
	role: string;
	text: string;
	startMs?: number | null;
	endMs?: number | null;
	sequence?: number;
};

export type ReportEgressEntry = {
	id?: string;
	type?: string | null;
	status?: string | null;
	role?: string | null;
	filename?: string | null;
	durationMs?: number | null;
	sizeBytes?: number | null;
	filepath?: string | null;
	url?: string | null;
};

type Tone = "good" | "warn" | "bad" | "neutral";

type Row = {
	label: string;
	value?: unknown;
	/** Render the value as a coloured pill. */
	tone?: Tone;
	/** Render the value as a list of chips. */
	chips?: string[];
	chipTone?: Tone;
};

type Doc = PDFKit.PDFDocument;

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

function asString(value: unknown) {
	if (value == null) {
		return "—";
	}
	if (typeof value === "string") {
		return value.trim() || "—";
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	if (typeof value === "number") {
		return String(value);
	}
	return JSON.stringify(value);
}

function humanize(key: string) {
	const spaced = key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
		.toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function pct(value: unknown) {
	if (typeof value === "number" && value >= 0 && value <= 1) {
		return `${Math.round(value * 100)}%`;
	}
	return asString(value);
}

function toDate(value?: Date | string | null) {
	if (!value) {
		return null;
	}
	const d = value instanceof Date ? value : new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(value?: Date | string | null) {
	const d = toDate(value);
	if (!d) {
		return value ? String(value) : "—";
	}
	try {
		return `${d.toLocaleString("en-IN", {
			timeZone: "Asia/Kolkata",
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		})} IST`;
	} catch {
		return d.toISOString();
	}
}

function formatDuration(
	start?: Date | string | null,
	end?: Date | string | null,
) {
	const a = toDate(start);
	const b = toDate(end);
	if (!a || !b || b < a) {
		return "—";
	}
	const total = Math.round((b.getTime() - a.getTime()) / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatMediaClock(ms: number | null | undefined) {
	if (ms == null || !Number.isFinite(ms) || ms < 0) {
		return null;
	}
	const totalSec = Math.floor(ms / 1000);
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimedFinding(finding: TimedMediaFinding) {
	const start = formatMediaClock(finding.startMs);
	const end = formatMediaClock(finding.endMs);
	const stamp =
		start && end && start !== end
			? `[${start}–${end}] `
			: start
				? `[${start}] `
				: "";
	const body = finding.detail
		? `${finding.label}: ${finding.detail}`
		: finding.label;
	return `${stamp}${body}`;
}

function formatTimedFindings(findings: TimedMediaFinding[]) {
	if (findings.length === 0) {
		return "—";
	}
	return findings.map(formatTimedFinding).join("\n");
}

function toneFromText(text: unknown): Tone {
	const t = String(text ?? "").toLowerCase();
	if (/(verified|pass|complete|success|clear|approved)/.test(t)) {
		return "good";
	}
	if (/(fail|reject|mismatch|error|denied|spoof)/.test(t)) {
		return "bad";
	}
	if (/(pending|partial|review|unknown|flag)/.test(t)) {
		return "warn";
	}
	return "neutral";
}

function toneColors(tone: Tone) {
	switch (tone) {
		case "good":
			return { fg: BRAND.good, bg: BRAND.goodSoft };
		case "warn":
			return { fg: BRAND.warn, bg: BRAND.warnSoft };
		case "bad":
			return { fg: BRAND.bad, bg: BRAND.badSoft };
		default:
			return { fg: BRAND.neutral, bg: BRAND.neutralSoft };
	}
}

function isEmbeddableImage(mimeType?: string) {
	if (!mimeType) {
		return true;
	}
	const normalized = mimeType.toLowerCase();
	return (
		normalized.includes("jpeg") ||
		normalized.includes("jpg") ||
		normalized.includes("png")
	);
}

/* -------------------------------------------------------------------------- */
/*  Layout primitives                                                         */
/* -------------------------------------------------------------------------- */

function contentWidth(doc: Doc) {
	return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: Doc, needed: number) {
	const bottom = doc.page.height - doc.page.margins.bottom;
	if (doc.y + needed > bottom) {
		doc.addPage();
	}
}

function pill(doc: Doc, text: string, tone: Tone, x: number, y: number) {
	const { fg, bg } = toneColors(tone);
	doc.font("Helvetica-Bold").fontSize(8);
	const w = doc.widthOfString(text) + 16;
	doc.roundedRect(x, y, w, 16, 8).fill(bg);
	doc.fillColor(fg).text(text, x + 8, y + 4.5, {
		lineBreak: false,
	});
	doc.fillColor(BRAND.text);
	return w;
}

function layoutChips(doc: Doc, items: string[], width: number) {
	doc.font("Helvetica-Bold").fontSize(8);
	const out: Array<{ item: string; x: number; y: number; w: number }> = [];
	let cx = 0;
	let cy = 0;
	for (const item of items) {
		const w = Math.min(doc.widthOfString(item) + 14, width);
		if (cx > 0 && cx + w > width) {
			cx = 0;
			cy += 20;
		}
		out.push({ item, x: cx, y: cy, w });
		cx += w + 5;
	}
	return { out, height: cy + 16 };
}

function measureRow(doc: Doc, row: Row, valueW: number) {
	if (row.chips && row.chips.length > 0) {
		return layoutChips(doc, row.chips, valueW).height + 8;
	}
	if (row.tone) {
		return 16 + 8;
	}
	doc.font("Helvetica").fontSize(10);
	const h = doc.heightOfString(asString(row.value), { width: valueW });
	return Math.max(h, 12) + 8;
}

function measureRows(doc: Doc, rows: Row[], width: number, labelW: number) {
	return rows.reduce(
		(sum, row) => sum + measureRow(doc, row, width - labelW),
		0,
	);
}

function drawRows(
	doc: Doc,
	rows: Row[],
	x: number,
	y: number,
	width: number,
	labelW: number,
) {
	const valueW = width - labelW;
	let cy = y;
	rows.forEach((row, index) => {
		const h = measureRow(doc, row, valueW);
		doc.font("Helvetica").fontSize(8.5).fillColor(BRAND.muted);
		doc.text(row.label, x, cy + 6, {
			width: labelW - 8,
			lineBreak: false,
		});

		if (row.chips && row.chips.length > 0) {
			const layout = layoutChips(doc, row.chips, valueW);
			const { fg, bg } = toneColors(row.chipTone ?? "neutral");
			for (const chip of layout.out) {
				doc.roundedRect(
					x + labelW + chip.x,
					cy + 5 + chip.y,
					chip.w,
					16,
					8,
				).fill(bg);
				doc.font("Helvetica-Bold").fontSize(8).fillColor(fg);
				doc.text(
					chip.item,
					x + labelW + chip.x + 7,
					cy + 9.5 + chip.y,
					{
						width: chip.w - 14,
						lineBreak: false,
						ellipsis: true,
					},
				);
			}
		} else if (row.tone) {
			pill(doc, asString(row.value), row.tone, x + labelW, cy + 5);
		} else {
			doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);
			doc.text(asString(row.value), x + labelW, cy + 5, {
				width: valueW,
			});
		}

		if (index < rows.length - 1) {
			doc.moveTo(x, cy + h)
				.lineTo(x + width, cy + h)
				.lineWidth(0.5)
				.strokeColor(BRAND.border)
				.stroke();
		}
		cy += h;
	});
	doc.fillColor(BRAND.text);
	return cy - y;
}

/* -------------------------------------------------------------------------- */
/*  Page chrome                                                               */
/* -------------------------------------------------------------------------- */

type ChromeContext = { logo?: Buffer; sessionId: string };

function drawHeader(doc: Doc, ctx: ChromeContext) {
	const { x, y } = doc;
	const w = doc.page.width;
	doc.save();
	doc.rect(0, 0, w, HEADER_H).fill("#FFFFFF");
	doc.rect(0, 0, w, 4).fill(BRAND.primary);
	doc.moveTo(0, HEADER_H)
		.lineTo(w, HEADER_H)
		.lineWidth(0.75)
		.strokeColor(BRAND.border)
		.stroke();

	let drewLogo = false;
	const logo = ctx.logo ?? REPORT_LOGO_PNG;
	if (logo) {
		try {
			doc.image(logo, PAGE_MARGIN, 15, { height: 26 });
			drewLogo = true;
		} catch {
			drewLogo = false;
		}
	}
	if (!drewLogo) {
		// Simple wordmark: ring mark + name.
		doc.circle(PAGE_MARGIN + 11, 28, 11).fill(BRAND.primary);
		doc.circle(PAGE_MARGIN + 11, 28, 5).fill("#FFFFFF");
		doc.font("Helvetica-Bold")
			.fontSize(15)
			.fillColor(BRAND.ink)
			.text(BRAND.name, PAGE_MARGIN + 30, 19, { lineBreak: false });
	}

	doc.font("Helvetica-Bold")
		.fontSize(8)
		.fillColor(BRAND.muted)
		.text("VERIFICATION REPORT", w - PAGE_MARGIN - 200, 25, {
			width: 200,
			align: "right",
			lineBreak: false,
			characterSpacing: 1,
		});
	doc.restore();
	doc.x = x;
	doc.y = y;
}

function drawFooters(doc: Doc) {
	const range = doc.bufferedPageRange();
	for (let i = 0; i < range.count; i++) {
		doc.switchToPage(range.start + i);
		const w = doc.page.width;
		const y = doc.page.height - 38;
		const savedBottom = doc.page.margins.bottom;
		doc.page.margins.bottom = 0;
		doc.moveTo(PAGE_MARGIN, y - 8)
			.lineTo(w - PAGE_MARGIN, y - 8)
			.lineWidth(0.5)
			.strokeColor(BRAND.border)
			.stroke();
		doc.font("Helvetica").fontSize(7.5).fillColor(BRAND.muted);
		doc.text(
			`${BRAND.company}  ·  ${BRAND.website}  ·  AI estimates only. Not a clinical measurement.`,
			PAGE_MARGIN,
			y,
			{ width: w - PAGE_MARGIN * 2 - 80, lineBreak: false },
		);
		doc.text(`Page ${i + 1} of ${range.count}`, w - PAGE_MARGIN - 80, y, {
			width: 80,
			align: "right",
			lineBreak: false,
		});
		doc.page.margins.bottom = savedBottom;
	}
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

type ImagePlacement = {
	image: ReportImage;
	width: number;
	height: number;
	captionH: number;
};

function planImages(
	doc: Doc,
	images: ReportImage[],
	maxW: number,
	maxH: number,
): ImagePlacement[] {
	const plans: ImagePlacement[] = [];
	for (const image of images) {
		if (!isEmbeddableImage(image.mimeType)) {
			continue;
		}
		try {
			const opened = (
				doc as unknown as {
					openImage: (b: Buffer) => { width: number; height: number };
				}
			).openImage(image.bytes);
			const scale = Math.min(maxW / opened.width, maxH / opened.height);
			plans.push({
				image,
				width: opened.width * scale,
				height: opened.height * scale,
				captionH: 16,
			});
		} catch {
			// Unreadable image: skip, an inline note is drawn by the caller.
		}
	}
	return plans;
}

type SectionOptions = {
	title: string;
	rows: Row[];
	columns?: 1 | 2;
	images?: ReportImage[];
	summary?: string;
	tag?: { text: string; tone: Tone };
};

function section(doc: Doc, opts: SectionOptions) {
	const W = contentWidth(doc);
	const left = doc.page.margins.left;
	const columns = opts.columns ?? 1;
	const innerW = W - CARD_PAD * 2;
	const headH = 36;

	const hasRows = opts.rows.length > 0;
	const imgColW = hasRows ? IMAGE_COL_W : innerW;
	const imgMaxH = hasRows ? 120 : 240;
	const plans = opts.images
		? planImages(doc, opts.images, imgColW, imgMaxH)
		: [];
	const hasImages = plans.length > 0 && hasRows;

	const textW = hasImages ? innerW - IMAGE_COL_W - COL_GAP : innerW;
	const labelW = columns === 2 ? 76 : 110;

	// Measure the text side.
	let rowsH = 0;
	let colA: Row[] = opts.rows;
	let colB: Row[] = [];
	let colW = textW;
	if (columns === 2) {
		const half = Math.ceil(opts.rows.length / 2);
		colA = opts.rows.slice(0, half);
		colB = opts.rows.slice(half);
		colW = (textW - COL_GAP) / 2;
		rowsH = Math.max(
			measureRows(doc, colA, colW, labelW),
			measureRows(doc, colB, colW, labelW),
		);
	} else {
		rowsH = measureRows(doc, colA, colW, labelW);
	}

	let summaryH = 0;
	if (opts.summary) {
		doc.font("Helvetica").fontSize(9.5);
		summaryH = doc.heightOfString(opts.summary, { width: textW - 24 }) + 18;
	}
	const textH = rowsH + (summaryH ? summaryH + 10 : 0);

	const imagesH = plans.reduce(
		(sum, p) => sum + p.height + p.captionH + 8,
		0,
	);
	const bodyH =
		Math.max(textH, hasRows ? imagesH : 0) + (hasRows ? 0 : imagesH);
	const total = headH + bodyH + CARD_PAD;

	ensureSpace(doc, total + 14);
	const top = doc.y;

	// Card shell
	doc.roundedRect(left, top, W, total, 8)
		.lineWidth(0.75)
		.fillAndStroke("#FFFFFF", BRAND.border);

	// Heading
	doc.roundedRect(left + CARD_PAD, top + 13, 3.5, 14, 1.75).fill(
		BRAND.primary,
	);
	doc.font("Helvetica-Bold")
		.fontSize(12)
		.fillColor(BRAND.ink)
		.text(opts.title, left + CARD_PAD + 11, top + 13, { lineBreak: false });
	if (opts.tag) {
		doc.font("Helvetica-Bold").fontSize(8);
		const tw = doc.widthOfString(opts.tag.text) + 16;
		pill(
			doc,
			opts.tag.text,
			opts.tag.tone,
			left + W - CARD_PAD - tw,
			top + 11,
		);
	}
	doc.moveTo(left + CARD_PAD, top + headH - 2)
		.lineTo(left + W - CARD_PAD, top + headH - 2)
		.lineWidth(0.5)
		.strokeColor(BRAND.border)
		.stroke();

	// Text side
	const bodyTop = top + headH + 2;
	const textX = left + CARD_PAD;
	if (columns === 2) {
		drawRows(doc, colA, textX, bodyTop, colW, labelW);
		drawRows(doc, colB, textX + colW + COL_GAP, bodyTop, colW, labelW);
	} else if (hasRows) {
		drawRows(doc, colA, textX, bodyTop, colW, labelW);
	}

	if (opts.summary) {
		const sy = bodyTop + rowsH + 10;
		doc.roundedRect(textX, sy, textW, summaryH, 6).fill(BRAND.primarySoft);
		doc.rect(textX, sy + 4, 3, summaryH - 8).fill(BRAND.primary);
		doc.font("Helvetica").fontSize(9.5).fillColor(BRAND.ink);
		doc.text(opts.summary, textX + 14, sy + 9, { width: textW - 24 });
	}

	// Images
	let iy = bodyTop;
	const imgX = hasRows ? left + W - CARD_PAD - IMAGE_COL_W : left + CARD_PAD;
	const imgAreaW = hasRows ? IMAGE_COL_W : innerW;
	for (const p of plans) {
		doc.font("Helvetica-Oblique")
			.fontSize(8)
			.fillColor(BRAND.muted)
			.text(p.image.label, imgX, iy, {
				width: imgAreaW,
				lineBreak: false,
			});
		const ix = imgX + (imgAreaW - p.width) / 2;
		const iyy = iy + p.captionH;
		try {
			doc.image(p.image.bytes, ix, iyy, {
				width: p.width,
				height: p.height,
			});
			doc.roundedRect(ix, iyy, p.width, p.height, 4)
				.lineWidth(0.75)
				.strokeColor(BRAND.border)
				.stroke();
		} catch {
			doc.fontSize(8)
				.fillColor(BRAND.bad)
				.text(`(Could not embed image: ${p.image.label})`, imgX, iyy);
		}
		iy += p.height + p.captionH + 8;
	}

	doc.fillColor(BRAND.text);
	doc.x = left;
	doc.y = top + total + 14;
}

function summaryTiles(
	doc: Doc,
	tiles: Array<{ label: string; value: string; tone: Tone }>,
) {
	if (tiles.length === 0) {
		return;
	}
	const W = contentWidth(doc);
	const left = doc.page.margins.left;
	const gap = 10;
	const w = (W - gap * (tiles.length - 1)) / tiles.length;
	const h = 54;
	ensureSpace(doc, h + 14);
	const top = doc.y;
	tiles.forEach((tile, i) => {
		const x = left + i * (w + gap);
		const { fg } = toneColors(tile.tone);
		doc.roundedRect(x, top, w, h, 8)
			.lineWidth(0.75)
			.fillAndStroke(BRAND.surface, BRAND.border);
		doc.roundedRect(x + 12, top + 12, 18, 3, 1.5).fill(fg);
		doc.font("Helvetica-Bold")
			.fontSize(7.5)
			.fillColor(BRAND.muted)
			.text(tile.label.toUpperCase(), x + 12, top + 20, {
				width: w - 24,
				lineBreak: false,
				characterSpacing: 0.6,
			});
		doc.font("Helvetica-Bold")
			.fontSize(14)
			.fillColor(fg)
			.text(tile.value, x + 12, top + 32, {
				width: w - 24,
				lineBreak: false,
			});
	});
	doc.fillColor(BRAND.text);
	doc.x = left;
	doc.y = top + h + 14;
}

function userResponsesSection(doc: Doc, entries: UserResponseEntry[]) {
	const W = contentWidth(doc);
	const left = doc.page.margins.left;

	ensureSpace(doc, 90);
	let top = doc.y;
	doc.roundedRect(left, top + 2, 3.5, 14, 1.75).fill(BRAND.primary);
	doc.font("Helvetica-Bold")
		.fontSize(12)
		.fillColor(BRAND.ink)
		.text("User responses", left + 11, top + 2, { lineBreak: false });
	doc.font("Helvetica").fontSize(9).fillColor(BRAND.muted);
	doc.text(
		entries.length > 0
			? `${entries.length} answer${entries.length === 1 ? "" : "s"} captured during the session · attached as User_response.json (PDF attachments panel)`
			: "No questions/answers were available for this session. An empty User_response.json is attached.",
		left,
		top + 22,
		{ width: W },
	);
	doc.y = top + 44;

	if (entries.length === 0) {
		doc.x = left;
		return;
	}

	const qW = W * 0.56;
	const aW = W - qW;
	const pad = 10;

	// Table header
	ensureSpace(doc, 60);
	top = doc.y;
	doc.roundedRect(left, top, W, 22, 5).fill(BRAND.ink);
	doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
	doc.text("QUESTION", left + pad, top + 7, {
		lineBreak: false,
		characterSpacing: 0.8,
	});
	doc.text("ANSWER", left + qW + pad, top + 7, {
		lineBreak: false,
		characterSpacing: 0.8,
	});
	let y = top + 22;

	entries.forEach((entry, i) => {
		const title = entry.label || entry.key || entry.question;
		const showSub = Boolean(entry.label || entry.key);
		doc.font("Helvetica-Bold").fontSize(9.5);
		const qh = doc.heightOfString(title, { width: qW - pad * 2 });
		let subH = 0;
		if (showSub) {
			doc.font("Helvetica").fontSize(8.5);
			subH = doc.heightOfString(entry.question, { width: qW - pad * 2 });
		}
		doc.font("Helvetica").fontSize(10);
		const ah = doc.heightOfString(asString(entry.answer), {
			width: aW - pad * 2,
		});
		const rowH = Math.max(qh + subH, ah) + 16;

		doc.y = y;
		ensureSpace(doc, rowH);
		if (doc.y !== y) {
			y = doc.y;
		}

		doc.rect(left, y, W, rowH).fill(
			i % 2 === 0 ? "#FFFFFF" : BRAND.surface,
		);
		doc.moveTo(left, y + rowH)
			.lineTo(left + W, y + rowH)
			.lineWidth(0.5)
			.strokeColor(BRAND.border)
			.stroke();

		doc.font("Helvetica-Bold").fontSize(9.5).fillColor(BRAND.ink);
		doc.text(title, left + pad, y + 8, { width: qW - pad * 2 });
		if (showSub) {
			doc.font("Helvetica")
				.fontSize(8.5)
				.fillColor(BRAND.muted)
				.text(entry.question, left + pad, y + 8 + qh, {
					width: qW - pad * 2,
				});
		}
		doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);
		doc.text(asString(entry.answer), left + qW + pad, y + 8, {
			width: aW - pad * 2,
		});
		y += rowH;
	});

	doc.fillColor(BRAND.text);
	doc.x = left;
	doc.y = y + 14;
}

function attachUserResponses(doc: Doc, entries: UserResponseEntry[]) {
	const payload = {
		generatedAt: new Date().toISOString(),
		count: entries.length,
		responses: entries.map((entry) => ({
			...(entry.key ? { key: entry.key } : {}),
			...(entry.label ? { label: entry.label } : {}),
			question: entry.question,
			answer: entry.answer ?? null,
		})),
	};
	const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");

	doc.file(json, {
		name: "User_response.json",
		type: "application/json",
		description: "Session questions and answers",
	});

	userResponsesSection(doc, entries);
}

function formatBytes(bytes: number | null | undefined) {
	if (bytes == null || bytes < 0) {
		return "—";
	}
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDurationMs(ms: number | null | undefined) {
	if (ms == null || !Number.isFinite(ms) || ms < 0) {
		return "—";
	}
	const total = Math.round(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function roleLabel(role: string) {
	const normalized = role.trim().toLowerCase();
	if (normalized === "assistant" || normalized === "agent") {
		return "Agent";
	}
	if (normalized === "user") {
		return "User";
	}
	if (normalized === "system") {
		return "System";
	}
	return humanize(role);
}

function attachJsonFile(
	doc: Doc,
	name: string,
	description: string,
	payload: unknown,
) {
	const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
	doc.file(json, {
		name,
		type: "application/json",
		description,
	});
}

function transcriptSection(doc: Doc, segments: ReportTranscriptSegment[]) {
	const W = contentWidth(doc);
	const left = doc.page.margins.left;
	const sorted = [...segments].sort(
		(a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
	);

	ensureSpace(doc, 90);
	let top = doc.y;
	doc.roundedRect(left, top + 2, 3.5, 14, 1.75).fill(BRAND.primary);
	doc.font("Helvetica-Bold")
		.fontSize(12)
		.fillColor(BRAND.ink)
		.text("Session transcript", left + 11, top + 2, { lineBreak: false });
	doc.font("Helvetica")
		.fontSize(9)
		.fillColor(BRAND.muted)
		.text(
			sorted.length > 0
				? `${sorted.length} segment${sorted.length === 1 ? "" : "s"}`
				: "No transcript segments",
			left + W - 140,
			top + 4,
			{ width: 140, align: "right", lineBreak: false },
		);
	doc.y = top + 28;
	doc.x = left;

	if (sorted.length === 0) {
		doc.font("Helvetica")
			.fontSize(10)
			.fillColor(BRAND.muted)
			.text(
				"No transcript was available for this session.",
				left,
				doc.y,
				{
					width: W,
				},
			);
		doc.moveDown(1);
		return;
	}

	for (const segment of sorted) {
		const text = segment.text?.trim();
		if (!text) {
			continue;
		}
		const stamp = formatMediaClock(segment.startMs);
		const speaker = roleLabel(segment.role || "unknown");
		const heading = stamp ? `${speaker}  ·  ${stamp}` : speaker;
		doc.font("Helvetica").fontSize(9.5);
		const textH = doc.heightOfString(text, { width: W - 16 });
		const blockH = 18 + textH + 10;
		ensureSpace(doc, blockH + 8);
		const y = doc.y;
		doc.roundedRect(left, y, W, blockH, 6)
			.lineWidth(0.5)
			.fillAndStroke(BRAND.surface, BRAND.border);
		doc.font("Helvetica-Bold")
			.fontSize(8.5)
			.fillColor(BRAND.primary)
			.text(heading, left + 10, y + 6, {
				width: W - 20,
				lineBreak: false,
			});
		doc.font("Helvetica")
			.fontSize(9.5)
			.fillColor(BRAND.text)
			.text(text, left + 10, y + 20, { width: W - 20 });
		doc.y = y + blockH + 8;
		doc.x = left;
	}
	doc.moveDown(0.4);
}

function egressSection(doc: Doc, entries: ReportEgressEntry[]) {
	if (entries.length === 0) {
		section(doc, {
			title: "Egress recordings",
			rows: [{ label: "Recordings", value: "None available" }],
			summary:
				"No completed egress jobs were found for this session. Media integrity may be limited.",
		});
		return;
	}

	for (const [index, entry] of entries.entries()) {
		const title =
			entries.length === 1
				? "Egress recording"
				: `Egress recording ${index + 1}`;
		const typeLabel = (entry.type ?? "Recording").replace(/_/g, " ");
		const role = entry.role ? humanize(entry.role) : null;
		section(doc, {
			title,
			tag: {
				text: String(entry.status ?? "unknown").toUpperCase(),
				tone:
					String(entry.status ?? "").toUpperCase() === "COMPLETE"
						? "good"
						: /fail|abort/i.test(String(entry.status ?? ""))
							? "bad"
							: "warn",
			},
			rows: [
				{ label: "Type", value: typeLabel },
				{ label: "Role", value: role ?? "—" },
				{ label: "File", value: entry.filename ?? "—" },
				{
					label: "Duration",
					value: formatDurationMs(entry.durationMs),
				},
				{ label: "Size", value: formatBytes(entry.sizeBytes) },
				{ label: "Path", value: entry.filepath ?? "—" },
				{ label: "URL", value: entry.url ?? "—" },
			],
		});
	}
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export async function buildPostProcessingPdf(args: {
	sessionId: string;
	agentName?: string | null;
	endUserName?: string | null;
	startedAt?: Date | string | null;
	endedAt?: Date | string | null;
	result: PostProcessingResult;
	images?: ReportImage[];
	userResponses?: UserResponseEntry[];
	transcriptSegments?: ReportTranscriptSegment[];
	egressEntries?: ReportEgressEntry[];
	/** Optional PNG/JPEG logo override. Defaults to Optimind icon + wordmark. */
	logo?: Buffer;
}): Promise<Buffer> {
	const doc = new PDFDocument({
		size: "LETTER",
		bufferPages: true,
		margins: {
			top: TOP_MARGIN,
			bottom: BOTTOM_MARGIN,
			left: PAGE_MARGIN,
			right: PAGE_MARGIN,
		},
		info: {
			Title: "Post Processing Report",
			Author: BRAND.company,
			Subject: `Session ${args.sessionId}`,
		},
	});
	const chunks: Buffer[] = [];

	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});

	const chrome: ChromeContext = {
		logo: args.logo,
		sessionId: args.sessionId,
	};
	doc.on("pageAdded", () => drawHeader(doc, chrome));
	drawHeader(doc, chrome);

	const images = args.images ?? [];
	const userResponses = args.userResponses ?? [];
	const transcriptSegments = args.transcriptSegments ?? [];
	const egressEntries = args.egressEntries ?? [];
	const placed = new Set<ReportImage>();
	const takeImages = (kind: ReportImageKind) => {
		const picked = images.filter((i) => i.kind === kind && !placed.has(i));
		for (const p of picked) {
			placed.add(p);
		}
		return picked;
	};

	const left = PAGE_MARGIN;
	const W = contentWidth(doc);

	/* Title block ----------------------------------------------------------- */
	let y = TOP_MARGIN - 4;
	doc.font("Helvetica-Bold")
		.fontSize(24)
		.fillColor(BRAND.ink)
		.text("Post Processing Report", left, y, { lineBreak: false });
	const statusTone = toneFromText(args.result.status);
	doc.font("Helvetica-Bold").fontSize(8);
	const statusText = String(args.result.status ?? "—").toUpperCase();
	const statusW = doc.widthOfString(statusText) + 16;
	pill(doc, statusText, statusTone, left + W - statusW, y + 8);
	y += 32;
	doc.font("Helvetica")
		.fontSize(9)
		.fillColor(BRAND.muted)
		.text(`Session ${args.sessionId}`, left, y, { lineBreak: false });
	y += 20;

	// Notice bar
	doc.roundedRect(left, y, W, 26, 6).fill(BRAND.warnSoft);
	doc.rect(left, y + 5, 3, 16).fill(BRAND.warn);
	doc.font("Helvetica-Bold")
		.fontSize(8.5)
		.fillColor(BRAND.warn)
		.text(
			"AI estimates only. Vitals and physical findings are not clinical measurements.",
			left + 14,
			y + 9,
			{ width: W - 24, lineBreak: false },
		);
	doc.y = y + 26 + 14;
	doc.x = left;

	/* Summary tiles --------------------------------------------------------- */
	const { face, idCard, body } = args.result;
	const tiles: Array<{ label: string; value: string; tone: Tone }> = [];
	if (body) {
		tiles.push({
			label: "Identity",
			value: asString(body.underwriting.identityStatus),
			tone: toneFromText(body.underwriting.identityStatus),
		});
	}
	if (face) {
		tiles.push({
			label: "Liveness",
			value: face.livenessPass ? "Pass" : "Fail",
			tone: face.livenessPass ? "good" : "bad",
		});
	}
	if (idCard) {
		tiles.push({
			label: "ID confidence",
			value: pct(idCard.confidence),
			tone: "neutral",
		});
	}
	if (body) {
		tiles.push({
			label: "Underwriter review",
			value: body.underwriting.underwriterReviewRecommended
				? "Recommended"
				: "Not required",
			tone: body.underwriting.underwriterReviewRecommended
				? "warn"
				: "good",
		});
	}
	summaryTiles(doc, tiles);

	/* Session --------------------------------------------------------------- */
	section(doc, {
		title: "Session",
		columns: 2,
		rows: [
			{ label: "Session ID", value: args.sessionId },
			{ label: "Agent", value: args.agentName ?? "—" },
			{ label: "End user", value: args.endUserName ?? "—" },
			{ label: "Started", value: formatDateTime(args.startedAt) },
			{ label: "Ended", value: formatDateTime(args.endedAt) },
			{
				label: "Duration",
				value: formatDuration(args.startedAt, args.endedAt),
			},
		],
	});

	/* Face liveness --------------------------------------------------------- */
	if (face) {
		section(doc, {
			title: "Face liveness",
			tag: {
				text: face.livenessPass ? "PASS" : "FAIL",
				tone: face.livenessPass ? "good" : "bad",
			},
			rows: [
				{ label: "Confidence", value: pct(face.confidence) },
				{
					label: "Signals",
					chips: face.signals,
					chipTone: "neutral",
					value: "—",
				},
			],
			summary: face.summary,
			images: takeImages("face"),
		});
	}

	/* ID card --------------------------------------------------------------- */
	if (idCard) {
		section(doc, {
			title: "ID card extraction",
			rows: [
				{ label: "Confidence", value: pct(idCard.confidence) },
				...Object.entries(idCard.extracted).map(
					([key, value]): Row => ({
						label: humanize(key),
						value: value as unknown,
					}),
				),
			],
			summary: idCard.summary,
			images: takeImages("id"),
		});
	}

	/* Body ------------------------------------------------------------------ */
	if (body) {
		const { vitals, physicalCondition, underwriting } = body;
		const joined = (items: string[]) => items.join("; ") || "—";

		section(doc, {
			title: "Body — vitals",
			tag: { text: "ESTIMATE", tone: "warn" },
			columns: 2,
			rows: [
				{ label: "Height (cm)", value: vitals.heightCm },
				{ label: "Weight (kg)", value: vitals.weightKg },
				{ label: "BMI", value: vitals.bmi },
				{ label: "Heart rate", value: vitals.heartRateBpm },
				{ label: "Resp. rate", value: vitals.respiratoryRate },
				{
					label: "Video used",
					value: body.videoUnavailable ? "No" : "Yes",
				},
			],
			summary: vitals.fitnessAssessment
				? `Fitness assessment: ${vitals.fitnessAssessment}`
				: undefined,
		});

		section(doc, {
			title: "Body — physical condition",
			rows: [
				{
					label: "Impairments",
					value: joined(physicalCondition.impairments),
				},
				{
					label: "Mobility limits",
					value: joined(physicalCondition.mobilityLimitations),
				},
				{
					label: "Posture notes",
					value: physicalCondition.postureNotes,
				},
				{
					label: "Assistive devices",
					value: joined(physicalCondition.assistiveDevices),
				},
				{
					label: "Other findings",
					value: joined(physicalCondition.otherFindings),
				},
			],
		});

		const flagRow = (label: string, items: string[], tone: Tone): Row =>
			items.length > 0
				? { label, chips: items, chipTone: tone }
				: { label, value: "—" };

		section(doc, {
			title: "Body — underwriting",
			rows: [
				{
					label: "Identity",
					value: asString(underwriting.identityStatus),
					tone: toneFromText(underwriting.identityStatus),
				},
				{
					label: "Liveness",
					value: asString(underwriting.livenessStatus),
					tone: toneFromText(underwriting.livenessStatus),
				},
				flagRow("Risk indicators", underwriting.riskIndicators, "bad"),
				flagRow("Exception flags", underwriting.exceptionFlags, "warn"),
				{
					label: "Review",
					value: underwriting.underwriterReviewRecommended
						? "Recommended"
						: "Not required",
					tone: underwriting.underwriterReviewRecommended
						? "warn"
						: "good",
				},
			],
			summary: underwriting.summary,
			images: takeImages("body"),
		});
	}

	/* Media integrity ------------------------------------------------------- */
	const mediaIntegrity = args.result.mediaIntegrity;
	if (mediaIntegrity) {
		const available = [
			mediaIntegrity.mediaAvailable.userVideo ? "user video" : null,
			mediaIntegrity.mediaAvailable.userAudio ? "user audio" : null,
			mediaIntegrity.mediaAvailable.agentAudio ? "agent audio" : null,
		]
			.filter(Boolean)
			.join(", ");

		section(doc, {
			title: "Media integrity",
			tag: {
				text: mediaIntegrity.underwriterReviewRecommended
					? "REVIEW"
					: "OK",
				tone: mediaIntegrity.underwriterReviewRecommended
					? "warn"
					: "good",
			},
			rows: [
				{ label: "Media used", value: available || "None" },
				{
					label: "Audio issues",
					value: formatTimedFindings(mediaIntegrity.audioIssues),
				},
				{
					label: "Video issues",
					value: formatTimedFindings(mediaIntegrity.videoIssues),
				},
				{
					label: "Multiple voices",
					value: mediaIntegrity.multipleVoices.detected
						? `Yes${
								mediaIntegrity.multipleVoices.count != null
									? ` (${mediaIntegrity.multipleVoices.count})`
									: ""
							}\n${formatTimedFindings(
								mediaIntegrity.multipleVoices.events,
							)}`
						: "No",
					tone: mediaIntegrity.multipleVoices.detected
						? "warn"
						: "good",
				},
				{
					label: "Multiple users",
					value: mediaIntegrity.multipleUsers.detected
						? `Yes${
								mediaIntegrity.multipleUsers.count != null
									? ` (${mediaIntegrity.multipleUsers.count})`
									: ""
							}\n${formatTimedFindings(
								mediaIntegrity.multipleUsers.events,
							)}`
						: "No",
					tone: mediaIntegrity.multipleUsers.detected
						? "warn"
						: "good",
				},
				{
					label: "Devices",
					chips:
						mediaIntegrity.deviceDetection.devices.length > 0
							? mediaIntegrity.deviceDetection.devices
							: undefined,
					value:
						mediaIntegrity.deviceDetection.devices.length > 0
							? undefined
							: "—",
					chipTone: "neutral",
				},
				{
					label: "Device events",
					value: formatTimedFindings(
						mediaIntegrity.deviceDetection.events,
					),
				},
				{
					label: "Device notes",
					value: mediaIntegrity.deviceDetection.summary || "—",
				},
				{
					label: "Review",
					value: mediaIntegrity.underwriterReviewRecommended
						? "Recommended"
						: "Not required",
					tone: mediaIntegrity.underwriterReviewRecommended
						? "warn"
						: "good",
				},
			],
			summary: mediaIntegrity.summary,
		});
	}

	/* Leftover images ------------------------------------------------------- */
	const leftover = images.filter((image) => !placed.has(image));
	if (leftover.length > 0) {
		for (const image of leftover) {
			placed.add(image);
		}
		section(doc, {
			title: "Capture images",
			rows: [],
			images: leftover,
		});
	}

	/* Egress recordings ----------------------------------------------------- */
	egressSection(doc, egressEntries);
	attachJsonFile(doc, "session-egress.json", "Egress recording catalog", {
		generatedAt: new Date().toISOString(),
		sessionId: args.sessionId,
		count: egressEntries.length,
		recordings: egressEntries,
	});

	/* Transcript ------------------------------------------------------------ */
	transcriptSection(doc, transcriptSegments);
	attachJsonFile(
		doc,
		"session-transcript.json",
		"Full session transcript segments",
		{
			generatedAt: new Date().toISOString(),
			sessionId: args.sessionId,
			count: transcriptSegments.length,
			segments: transcriptSegments,
		},
	);

	/* User responses + attachment ------------------------------------------ */
	attachUserResponses(doc, userResponses);

	/* Errors ---------------------------------------------------------------- */
	if (args.result.error) {
		section(doc, {
			title: "Errors",
			tag: { text: "ATTENTION", tone: "bad" },
			rows: [],
			summary: args.result.error,
		});
	}

	drawFooters(doc);
	doc.end();
	return done;
}

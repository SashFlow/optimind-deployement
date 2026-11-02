import PDFDocument from "pdfkit";
import type { PostProcessingResult } from "./types";

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

function asString(value: unknown) {
	if (value == null) {
		return "—";
	}
	if (typeof value === "string") {
		return value.trim() || "—";
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

function writeKeyValues(
	doc: PDFKit.PDFDocument,
	entries: Array<[string, unknown]>,
) {
	for (const [label, value] of entries) {
		doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
		doc.font("Helvetica").text(asString(value));
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

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
	const bottom = doc.page.height - doc.page.margins.bottom;
	if (doc.y + needed > bottom) {
		doc.addPage();
	}
}

function embedImage(doc: PDFKit.PDFDocument, image: ReportImage) {
	if (!isEmbeddableImage(image.mimeType)) {
		return;
	}
	ensureSpace(doc, 220);
	doc.moveDown(0.4);
	doc.fontSize(9).font("Helvetica-Oblique").fillColor("#555555");
	doc.text(image.label);
	doc.fillColor("#000000");
	const maxWidth =
		doc.page.width - doc.page.margins.left - doc.page.margins.right;
	try {
		doc.image(image.bytes, {
			fit: [maxWidth, 280],
			align: "center",
		});
	} catch {
		doc.fontSize(9)
			.font("Helvetica")
			.fillColor("#aa0000")
			.text(`(Could not embed image: ${image.label})`)
			.fillColor("#000000");
	}
	doc.moveDown(0.5);
}

function embedImagesOfKind(
	doc: PDFKit.PDFDocument,
	images: ReportImage[],
	kind: ReportImageKind,
	placed: Set<ReportImage>,
) {
	for (const image of images) {
		if (image.kind !== kind || placed.has(image)) {
			continue;
		}
		embedImage(doc, image);
		placed.add(image);
	}
}

function attachUserResponses(
	doc: PDFKit.PDFDocument,
	entries: UserResponseEntry[],
) {
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

	ensureSpace(doc, 40);
	doc.moveDown();
	doc.fontSize(12).font("Helvetica-Bold").text("User responses");
	doc.moveDown(0.3);
	doc.fontSize(10).font("Helvetica");
	doc.text(
		entries.length > 0
			? `${entries.length} question/answer pair(s) attached as User_response.json (see PDF attachments panel).`
			: "No questions/answers were available for this session. An empty User_response.json is attached.",
	);

	if (entries.length > 0) {
		doc.moveDown(0.4);
		for (const entry of entries) {
			ensureSpace(doc, 36);
			const title = entry.label || entry.key || entry.question;
			doc.font("Helvetica-Bold").text(title);
			if (entry.label || entry.key) {
				doc.font("Helvetica")
					.fillColor("#444444")
					.text(entry.question)
					.fillColor("#000000");
			}
			doc.font("Helvetica").text(`Answer: ${asString(entry.answer)}`);
			doc.moveDown(0.3);
		}
	}
}

export async function buildPostProcessingPdf(args: {
	sessionId: string;
	agentName?: string | null;
	endUserName?: string | null;
	startedAt?: Date | string | null;
	endedAt?: Date | string | null;
	result: PostProcessingResult;
	images?: ReportImage[];
	userResponses?: UserResponseEntry[];
}): Promise<Buffer> {
	const doc = new PDFDocument({ margin: 50, size: "LETTER" });
	const chunks: Buffer[] = [];

	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});

	const images = args.images ?? [];
	const userResponses = args.userResponses ?? [];
	const placed = new Set<ReportImage>();

	doc.fontSize(18).font("Helvetica-Bold").text("Post Processing Report");
	doc.moveDown(0.5);
	doc.fontSize(10).font("Helvetica").fillColor("#444444");
	doc.text(
		"AI estimates only. Vitals and physical findings are not clinical measurements.",
	);
	doc.fillColor("#000000");
	doc.moveDown();

	doc.fontSize(12).font("Helvetica-Bold").text("Session");
	doc.moveDown(0.3);
	doc.fontSize(10);
	writeKeyValues(doc, [
		["Session ID", args.sessionId],
		["Agent", args.agentName ?? "—"],
		["End user", args.endUserName ?? "—"],
		["Started", args.startedAt ? String(args.startedAt) : "—"],
		["Ended", args.endedAt ? String(args.endedAt) : "—"],
		["Status", args.result.status],
	]);

	if (args.result.face) {
		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("Face liveness");
		doc.moveDown(0.3);
		doc.fontSize(10);
		writeKeyValues(doc, [
			["Pass", args.result.face.livenessPass],
			["Confidence", args.result.face.confidence],
			["Signals", args.result.face.signals.join("; ") || "—"],
			["Summary", args.result.face.summary],
		]);
		embedImagesOfKind(doc, images, "face", placed);
	}

	if (args.result.idCard) {
		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("ID card extraction");
		doc.moveDown(0.3);
		doc.fontSize(10);
		writeKeyValues(doc, [
			["Confidence", args.result.idCard.confidence],
			["Summary", args.result.idCard.summary],
			...Object.entries(args.result.idCard.extracted).map(
				([key, value]) => [key, value] as [string, unknown],
			),
		]);
		embedImagesOfKind(doc, images, "id", placed);
	}

	if (args.result.body) {
		const { vitals, physicalCondition, underwriting } = args.result.body;
		doc.moveDown();
		doc.fontSize(12)
			.font("Helvetica-Bold")
			.text("Body — vitals (estimate)");
		doc.moveDown(0.3);
		doc.fontSize(10);
		writeKeyValues(doc, [
			["Height (cm)", vitals.heightCm],
			["Weight (kg)", vitals.weightKg],
			["BMI", vitals.bmi],
			["Heart rate (bpm)", vitals.heartRateBpm],
			["Respiratory rate", vitals.respiratoryRate],
			["Fitness assessment", vitals.fitnessAssessment],
			["Video used", args.result.body.videoUnavailable ? "No" : "Yes"],
		]);

		doc.moveDown();
		doc.fontSize(12)
			.font("Helvetica-Bold")
			.text("Body — physical condition");
		doc.moveDown(0.3);
		doc.fontSize(10);
		writeKeyValues(doc, [
			["Impairments", physicalCondition.impairments.join("; ") || "—"],
			[
				"Mobility limitations",
				physicalCondition.mobilityLimitations.join("; ") || "—",
			],
			["Posture notes", physicalCondition.postureNotes],
			[
				"Assistive devices",
				physicalCondition.assistiveDevices.join("; ") || "—",
			],
			[
				"Other findings",
				physicalCondition.otherFindings.join("; ") || "—",
			],
		]);

		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("Body — underwriting");
		doc.moveDown(0.3);
		doc.fontSize(10);
		writeKeyValues(doc, [
			["Identity status", underwriting.identityStatus],
			["Liveness status", underwriting.livenessStatus],
			["Risk indicators", underwriting.riskIndicators.join("; ") || "—"],
			["Exception flags", underwriting.exceptionFlags.join("; ") || "—"],
			[
				"Underwriter review recommended",
				underwriting.underwriterReviewRecommended,
			],
			["Summary", underwriting.summary],
		]);
		embedImagesOfKind(doc, images, "body", placed);
	}

	const leftover = images.filter((image) => !placed.has(image));
	if (leftover.length > 0) {
		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("Capture images");
		for (const image of leftover) {
			embedImage(doc, image);
			placed.add(image);
		}
	}

	attachUserResponses(doc, userResponses);

	if (args.result.error) {
		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("Errors");
		doc.moveDown(0.3);
		doc.fontSize(10).font("Helvetica").text(args.result.error);
	}

	doc.end();
	return done;
}

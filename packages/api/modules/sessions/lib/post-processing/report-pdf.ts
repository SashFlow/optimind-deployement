import PDFDocument from "pdfkit";
import type { PostProcessingResult } from "./types";

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

export async function buildPostProcessingPdf(args: {
	sessionId: string;
	agentName?: string | null;
	endUserName?: string | null;
	startedAt?: Date | string | null;
	endedAt?: Date | string | null;
	result: PostProcessingResult;
}): Promise<Buffer> {
	const doc = new PDFDocument({ margin: 50, size: "LETTER" });
	const chunks: Buffer[] = [];

	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});

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
		["Model", args.result.model ?? "—"],
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
	}

	if (args.result.error) {
		doc.moveDown();
		doc.fontSize(12).font("Helvetica-Bold").text("Errors");
		doc.moveDown(0.3);
		doc.fontSize(10).font("Helvetica").text(args.result.error);
	}

	doc.end();
	return done;
}

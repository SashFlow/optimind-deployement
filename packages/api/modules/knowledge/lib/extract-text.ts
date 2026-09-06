function extensionFromName(name: string): string {
	const parts = name.toLowerCase().split(".");
	return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

async function parsePdf(buffer: Buffer): Promise<string> {
	// Import the implementation directly. The package root entry runs a debug
	// harness when bundlers leave `module.parent` unset, which tries to open a
	// local test PDF under apps/web/test/data/.
	const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
	const pdfParse =
		(
			pdfParseModule as {
				default?: (data: Buffer) => Promise<{ text?: string }>;
			}
		).default ??
		(pdfParseModule as unknown as (
			data: Buffer,
		) => Promise<{ text?: string }>);
	const parsed = await pdfParse(buffer);
	return (parsed.text ?? "").trim();
}

export async function extractTextFromBuffer(
	buffer: Buffer,
	options?: { fileName?: string; contentType?: string },
): Promise<string> {
	const fileName = options?.fileName ?? "";
	const contentType = (options?.contentType ?? "").toLowerCase();
	const ext = extensionFromName(fileName);

	const isPdf =
		ext === "pdf" ||
		contentType.includes("application/pdf") ||
		buffer.subarray(0, 4).toString() === "%PDF";

	if (isPdf) {
		return parsePdf(buffer);
	}

	const isTextLike =
		ext === "txt" ||
		ext === "md" ||
		ext === "markdown" ||
		ext === "csv" ||
		ext === "json" ||
		ext === "html" ||
		ext === "htm" ||
		contentType.startsWith("text/") ||
		contentType.includes("json") ||
		contentType.includes("markdown");

	if (isTextLike || !ext) {
		return buffer.toString("utf8").trim();
	}

	throw new Error(
		`Unsupported file type${fileName ? ` (${fileName})` : ""}. Upload PDF or text files.`,
	);
}

export async function extractTextFromUrl(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "User-Agent": "OptimindKnowledgeBot/1.0" },
		redirect: "follow",
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch URL (${response.status})`);
	}
	const contentType = response.headers.get("content-type") ?? "";
	const buffer = Buffer.from(await response.arrayBuffer());
	const fileName = url.split("?")[0]?.split("/").pop() ?? "page.html";
	if (
		contentType.includes("text/html") ||
		fileName.endsWith(".html") ||
		fileName.endsWith(".htm")
	) {
		return stripHtml(buffer.toString("utf8"));
	}
	return extractTextFromBuffer(buffer, { fileName, contentType });
}

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

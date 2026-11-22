const PARTICIPANT_MIME = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
	"image/heic",
	"image/heif",
]);

const KNOWLEDGE_MIME = new Set([
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	"text/html",
	"application/json",
	"application/octet-stream",
]);

const PARTICIPANT_EXT = new Set([
	"jpg",
	"jpeg",
	"png",
	"webp",
	"pdf",
	"heic",
	"heif",
]);

const KNOWLEDGE_EXT = new Set([
	"pdf",
	"txt",
	"md",
	"markdown",
	"csv",
	"html",
	"htm",
	"json",
]);

function extensionOf(fileName: string): string {
	const parts = fileName.toLowerCase().split(".");
	return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function assertParticipantUpload(opts: {
	fileName?: string;
	contentType?: string;
	sizeBytes?: number;
	maxBytes?: number;
}) {
	const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
	if (opts.sizeBytes !== undefined && opts.sizeBytes > maxBytes) {
		throw new Error(`File exceeds ${maxBytes} byte limit`);
	}
	const contentType = (opts.contentType ?? "")
		.split(";")[0]
		?.trim()
		.toLowerCase();
	const ext = opts.fileName ? extensionOf(opts.fileName) : "";
	const mimeOk = !contentType || PARTICIPANT_MIME.has(contentType);
	const extOk = !ext || PARTICIPANT_EXT.has(ext);
	if (!mimeOk && !extOk) {
		throw new Error(
			"Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, PDF",
		);
	}
	if (
		contentType &&
		!PARTICIPANT_MIME.has(contentType) &&
		ext &&
		!PARTICIPANT_EXT.has(ext)
	) {
		throw new Error(
			"Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, PDF",
		);
	}
}

export function assertKnowledgeUpload(opts: {
	fileName?: string;
	contentType?: string;
	sizeBytes?: number;
	maxBytes?: number;
}) {
	const maxBytes = opts.maxBytes ?? 25 * 1024 * 1024;
	if (opts.sizeBytes !== undefined && opts.sizeBytes > maxBytes) {
		throw new Error(`File exceeds ${maxBytes} byte limit`);
	}
	const contentType = (opts.contentType ?? "")
		.split(";")[0]
		?.trim()
		.toLowerCase();
	const ext = opts.fileName ? extensionOf(opts.fileName) : "";
	if (
		contentType &&
		!KNOWLEDGE_MIME.has(contentType) &&
		contentType !== "application/octet-stream"
	) {
		if (!ext || !KNOWLEDGE_EXT.has(ext)) {
			throw new Error(
				"Unsupported knowledge file type. Allowed: PDF, TXT, MD, CSV, HTML, JSON",
			);
		}
	}
	if (ext && !KNOWLEDGE_EXT.has(ext)) {
		throw new Error(
			"Unsupported knowledge file type. Allowed: PDF, TXT, MD, CSV, HTML, JSON",
		);
	}
}

export { PARTICIPANT_MIME, KNOWLEDGE_MIME };

export function titleFromFileName(fileName: string): string {
	const base = fileName.split(/[/\\]/).pop() ?? fileName;
	const withoutExt = base.replace(/\.[^.]+$/, "");
	const cleaned = withoutExt
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned || "Untitled document";
}

export function titleFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname.replace(/\/+$/, "");
		const last = path.split("/").filter(Boolean).pop();
		if (last) {
			return decodeURIComponent(last)
				.replace(/\.[^.]+$/, "")
				.replace(/[-_]+/g, " ")
				.trim();
		}
		return parsed.hostname;
	} catch {
		return "Web document";
	}
}

export function titleFromText(content: string): string {
	const line =
		content
			.split(/\r?\n/)
			.map((part) => part.trim())
			.find((part) => part.length > 0) ?? "Untitled document";
	return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

type SessionFileLike = {
	id: string;
	name: string;
	url: string;
	type: string;
	size: number;
};

export type ClassifiedSessionFiles = {
	face: SessionFileLike | null;
	idCard: SessionFileLike | null;
	idCardFull: SessionFileLike | null;
	body: SessionFileLike | null;
};

function baseName(name: string) {
	return name.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
}

/**
 * Map session uploads to capture kinds by filename convention used by
 * upload-face-capture / upload-id-capture / upload-body-capture.
 */
export function classifySessionFiles(
	files: SessionFileLike[],
): ClassifiedSessionFiles {
	let face: SessionFileLike | null = null;
	let idCard: SessionFileLike | null = null;
	let idCardFull: SessionFileLike | null = null;
	let body: SessionFileLike | null = null;

	for (const file of files) {
		const name = baseName(file.name);
		if (name === "face-full.jpg" || name.startsWith("face-full.")) {
			face = file;
			continue;
		}
		if (name === "id-card.jpg" || name.startsWith("id-card.")) {
			idCard = file;
			continue;
		}
		if (name === "id-card-full.jpg" || name.startsWith("id-card-full.")) {
			idCardFull = file;
			continue;
		}
		if (name === "body-full.jpg" || name.startsWith("body-full.")) {
			body = file;
		}
	}

	return { face, idCard, idCardFull, body };
}

export function hasAnyCapture(classified: ClassifiedSessionFiles) {
	return Boolean(
		classified.face ||
			classified.idCard ||
			classified.idCardFull ||
			classified.body,
	);
}

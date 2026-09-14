import type { ThreadMessageLike } from "@assistant-ui/react";

export type SessionTranscriptSegment = {
	id: string;
	sequence?: number;
	role?: string;
	speakerIdentity?: string | null;
	text?: string;
	startMs?: number | null;
	endMs?: number | null;
};

export type PreviewTranscriptItem = {
	id: string;
	topic: string;
	text: string;
	from?: string;
	timestamp: number;
};

function roleFromSession(role?: string): ThreadMessageLike["role"] {
	const normalized = role?.toUpperCase() ?? "";
	if (normalized === "USER" || normalized === "CALLER") {
		return "user";
	}
	if (normalized === "SYSTEM") {
		return "system";
	}
	return "assistant";
}

export function sessionSegmentsToThreadMessages(
	segments: SessionTranscriptSegment[],
	fullText?: string | null,
): ThreadMessageLike[] {
	if (segments.length > 0) {
		const messages: ThreadMessageLike[] = [];
		for (const segment of segments) {
			const role = roleFromSession(segment.role);
			if (role === "system" && (!segment.text || !segment.text.trim())) {
				continue;
			}
			const message: ThreadMessageLike = {
				id: segment.id,
				role,
				content: [{ type: "text", text: segment.text?.trim() || "—" }],
			};
			if (segment.startMs != null) {
				(message as { createdAt?: Date }).createdAt = new Date(
					segment.startMs,
				);
			}
			messages.push(message);
		}
		return messages;
	}

	const fallback = fullText?.trim();
	if (!fallback) {
		return [];
	}

	return [
		{
			id: "full-text",
			role: "assistant",
			content: [{ type: "text", text: fallback }],
		},
	];
}

export function previewItemsToThreadMessages(
	items: PreviewTranscriptItem[],
	localIdentity: string,
): ThreadMessageLike[] {
	return items.map((item) => {
		const isLocal = item.from === localIdentity;
		return {
			id: item.id,
			role: isLocal ? ("user" as const) : ("assistant" as const),
			content: [{ type: "text" as const, text: item.text }],
			createdAt: new Date(item.timestamp),
		};
	});
}

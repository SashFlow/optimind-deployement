import { useMemo } from "react";
import { AssistantTranscriptThread } from "../transcript/AssistantTranscriptThread";
import { previewItemsToThreadMessages } from "../transcript/mapTranscriptMessages";
import type { PreviewTextItem } from "./usePreviewRoomData";

export default function MessageList({
	messages,
	localIdentity,
}: {
	messages: PreviewTextItem[];
	localIdentity: string;
}) {
	const threadMessages = useMemo(
		() => previewItemsToThreadMessages(messages, localIdentity),
		[messages, localIdentity],
	);

	return (
		<AssistantTranscriptThread
			messages={threadMessages}
			className="min-h-[12rem]"
			emptyFallback={
				<p className="text-sm text-muted-foreground">
					Transcriptions and agent text will appear here.
				</p>
			}
		/>
	);
}

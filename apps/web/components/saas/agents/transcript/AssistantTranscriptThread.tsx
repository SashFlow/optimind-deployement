"use client";

import {
	AssistantRuntimeProvider,
	type ThreadMessageLike,
	useExternalStoreRuntime,
} from "@assistant-ui/react";
import { ReadOnlyThread } from "@repo/ui/assistant-ui";
import { cn } from "@repo/ui/utils";
import { type ReactNode, useCallback } from "react";

type AssistantTranscriptThreadProps = {
	messages: ThreadMessageLike[];
	className?: string;
	emptyFallback?: ReactNode;
};

export function AssistantTranscriptThread({
	messages,
	className,
	emptyFallback,
}: AssistantTranscriptThreadProps) {
	const onNew = useCallback(async () => {
		// Read-only transcript / live preview — no typed composer.
	}, []);

	const convertMessage = useCallback(
		(message: ThreadMessageLike) => message,
		[],
	);

	const runtime = useExternalStoreRuntime({
		messages,
		isDisabled: true,
		onNew,
		convertMessage,
	});

	const isEmpty = messages.length === 0;

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
				{isEmpty && emptyFallback ? emptyFallback : <ReadOnlyThread />}
			</div>
		</AssistantRuntimeProvider>
	);
}

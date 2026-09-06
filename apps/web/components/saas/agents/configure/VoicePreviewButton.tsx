"use client";

import { Button } from "@repo/ui/button";
import { PlayIcon } from "lucide-react";
import { useRef } from "react";

export function VoicePreviewButton({
	previewUrl,
}: {
	previewUrl: string | null | undefined;
}) {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	if (!previewUrl) {
		return (
			<Button
				type="button"
				variant="outline"
				size="icon"
				disabled
				aria-label="No preview"
			>
				<PlayIcon />
			</Button>
		);
	}

	return (
		<>
			<audio ref={audioRef} src={previewUrl} preload="none" />
			<Button
				type="button"
				variant="outline"
				size="icon"
				aria-label="Play voice preview"
				onClick={() => {
					if (!audioRef.current) return;
					void audioRef.current.play();
				}}
			>
				<PlayIcon />
			</Button>
		</>
	);
}

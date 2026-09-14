"use client";

import { cn } from "@repo/ui/utils";
import { useState } from "react";

const PROVIDER_LOGOS: Record<string, string> = {
	openai: "/images/providers/openai.png",
	gemini: "/images/providers/gemini.png",
	sarvam: "/images/providers/sarvam.png",
	inworld: "/images/providers/inworld.png",
};

export function ProviderIcon({
	providerId,
	className,
}: {
	providerId: string;
	className?: string;
}) {
	const [failed, setFailed] = useState(false);
	const src = PROVIDER_LOGOS[providerId];

	if (!src || failed) {
		return (
			<span
				aria-hidden
				className={cn(
					"inline-flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold uppercase text-muted-foreground",
					className,
				)}
				title={providerId}
			>
				{providerId.slice(0, 2)}
			</span>
		);
	}

	return (
		// Brand logos from public/images/providers (fetched from provider domains).
		// eslint-disable-next-line @next/next/no-img-element
		// biome-ignore lint/performance/noImgElement: provider brand logos
		<img
			src={src}
			alt=""
			aria-hidden
			width={20}
			height={20}
			className={cn("size-5 shrink-0 rounded object-contain", className)}
			onError={() => setFailed(true)}
		/>
	);
}

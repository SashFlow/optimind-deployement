"use client";

import { LocaleLink } from "@i18n/routing";
import { cn } from "@repo/ui/utils";
import {
	ArrowUpRightIcon,
	BellRingIcon,
	CalendarClockIcon,
	ClipboardListIcon,
	FileHeartIcon,
	FileTextIcon,
	HeartPulseIcon,
	HomeIcon,
	type LucideIcon,
	MapPinnedIcon,
	MessageSquareHeartIcon,
	PhoneCallIcon,
	PlayIcon,
	ShieldIcon,
	StethoscopeIcon,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useCases } from "@/components/marketing/home/use-cases-data";

const FALLBACK_YOUTUBE_ID = "iuX5PDP73bQ";
const CYCLE_MS = 5000;

const useCaseIcons: Record<string, LucideIcon> = {
	"health-reports": FileHeartIcon,
	insurance: ShieldIcon,
	"claims-status": FileTextIcon,
	"mer-calls": StethoscopeIcon,
	"feedback-calls": MessageSquareHeartIcon,
	"reminder-calls": BellRingIcon,
	"appointment-scheduling": CalendarClockIcon,
	"patient-intake": ClipboardListIcon,
	"patient-follow-up": PhoneCallIcon,
	"discharge-assistant": HomeIcon,
	"hospital-navigation": MapPinnedIcon,
	"health-coach": HeartPulseIcon,
};

function getUseCaseLabel(category: string) {
	return category.replace(/^\d+\s*—\s*/, "");
}

function buildEmbedSrc(youtubeId: string) {
	return `https://www.youtube-nocookie.com/embed/${youtubeId}?${new URLSearchParams(
		{
			autoplay: "1",
			cc_load_policy: "0",
			controls: "0",
			disablekb: "1",
			fs: "0",
			iv_load_policy: "3",
			modestbranding: "1",
			playsinline: "1",
			rel: "0",
		},
	).toString()}`;
}

function UseCaseVideoPlayer({
	youtubeId,
	title,
	onPlayingChange,
}: {
	youtubeId: string;
	title: string;
	onPlayingChange: (playing: boolean) => void;
}) {
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		setPlaying(false);
		onPlayingChange(false);
		// Reset playback only when the active use-case video changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [youtubeId]);

	const handlePlay = () => {
		setPlaying(true);
		onPlayingChange(true);
	};

	return (
		<div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl ring-1 ring-black/5">
			{playing ? (
				<iframe
					key={youtubeId}
					src={buildEmbedSrc(youtubeId)}
					title={title}
					className="absolute top-1/2 left-1/2 aspect-video h-[100%] w-[100%] max-w-none -translate-x-1/2 -translate-y-1/2 border-0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
				/>
			) : (
				<button
					type="button"
					onClick={handlePlay}
					aria-label={`Play ${title}`}
					className="group absolute inset-0 cursor-pointer"
				>
					{/* eslint-disable-next-line @next/next/no-img-element -- YouTube CDN thumbnail */}
					<img
						src={`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`}
						alt=""
						className="absolute inset-0 size-full object-cover"
					/>
					<span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
					<span className="bg-background/90 absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition group-hover:scale-105 lg:size-20">
						<PlayIcon className="fill-foreground text-foreground size-7 translate-x-0.5 lg:size-8" />
					</span>
				</button>
			)}
		</div>
	);
}

const Solutions = () => {
	const [activeIndex, setActiveIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const active = useCases[activeIndex] ?? useCases[0];
	const youtubeId = active?.youtubeId || FALLBACK_YOUTUBE_ID;

	useEffect(() => {
		if (paused || useCases.length < 2) return;

		const timer = window.setInterval(() => {
			setActiveIndex((index) => (index + 1) % useCases.length);
		}, CYCLE_MS);

		return () => window.clearInterval(timer);
	}, [paused]);

	const selectUseCase = (index: number) => {
		setActiveIndex(index);
		setPaused(false);
	};

	return (
		<section id="solutions" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 text-center">
					<span className="text-primary text-base font-medium">
						Solutions
					</span>
					<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
						<span className="text-primary">AI</span> for Insurance
						and Healthcare
					</h2>
					<p className="text-muted-foreground max-w-2xl text-base text-pretty">
						See how Optimind handles real insurance and healthcare
						conversations.
					</p>
				</div>

				{active ? (
					<UseCaseVideoPlayer
						youtubeId={youtubeId}
						title={active.title}
						onPlayingChange={setPaused}
					/>
				) : null}

				<div
					role="radiogroup"
					aria-label="Use cases"
					className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4"
				>
					{useCases.map((useCase, index) => {
						const Icon = useCaseIcons[useCase.id] ?? FileTextIcon;
						const isActive = index === activeIndex;
						const label = getUseCaseLabel(useCase.category);

						return (
							<div key={useCase.id} className="relative">
								<button
									type="button"
									onClick={() => selectUseCase(index)}
									className={cn(
										"flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
										"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
										isActive
											? "border-primary bg-primary text-primary-foreground"
											: "bg-background text-foreground border-border hover:bg-muted/60",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<h3 className="flex items-center gap-2 text-lg font-medium tracking-tight text-balance">
											<Icon className="size-6 shrink-0" />
											{label}
										</h3>
										<LocaleLink
											href={useCase.blogHref}
											aria-label={`Read blog post about ${label}`}
											className={cn(
												"absolute top-4 right-4 flex size-5 items-center justify-center rounded-md border transition-colors",
												isActive
													? "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15"
													: "border-muted-foreground/40 text-muted-foreground hover:bg-muted hover:text-foreground",
											)}
										>
											<ArrowUpRightIcon className="size-3.5" />
										</LocaleLink>
									</div>
									<p
										className={cn(
											"text-base text-pretty",
											isActive
												? "text-primary-foreground/85"
												: "text-muted-foreground",
										)}
									>
										{useCase.snippet}
									</p>
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default Solutions;

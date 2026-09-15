"use client";

import { VoiceOrb } from "@repo/ui/assistant-ui";
import { cn } from "@repo/ui/utils";
import { PauseIcon, PlayIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
	ReasoningWindow,
	WaveSegment,
} from "@/components/marketing/home/use-case-audio-timelines";

/** Timeline content inset — must match playhead / seek hit area. */
function timelineInsetClass(compact: boolean) {
	return compact ? "left-12 sm:left-16 md:left-20" : "left-14 sm:left-20 md:left-24";
}

function Waveform({
	segments,
	segmentColor = "bg-foreground",
	compact = false,
}: {
	segments: WaveSegment[];
	segmentColor?: string;
	compact?: boolean;
}) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-y-0 right-0 flex items-center",
				timelineInsetClass(compact),
			)}
		>
			<div className="border-foreground/20 absolute inset-x-0 top-1/2 border-t border-dashed" />
			{segments.map((segment) => {
				const left = `${segment.start * 100}%`;
				const width = `${(segment.end - segment.start) * 100}%`;
				return (
					<div
						key={`${segment.start}-${segment.end}`}
						className="absolute flex h-[62%] items-center justify-between gap-px"
						style={{ left, width }}
					>
						{segment.bars.map((height, index) => (
							<span
								key={`${segment.start}-${index}`}
								className={cn(
									"w-px rounded-full sm:w-0.5",
									segmentColor,
								)}
								style={{ height: `${height * 100}%` }}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

function Track({
	label,
	tone,
	compact = false,
	children,
}: {
	label: string;
	tone: string;
	compact?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-md",
				compact ? "h-9 sm:h-10" : "h-14 sm:h-16",
				tone,
			)}
		>
			<span
				className={cn(
					"text-foreground absolute top-1/2 left-2 z-10 -translate-y-1/2 font-semibold tracking-wide sm:left-3 md:left-4",
					compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm",
				)}
			>
				{label}
			</span>
			{children}
		</div>
	);
}

/** Shared Solutions media frame — keeps audio / multi / video / empty the same size. */
export const USE_CASE_MEDIA_SHELL_CLASS =
	"bg-primary text-white relative w-full overflow-hidden rounded-xl aspect-video";

export function UseCaseMediaShell({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn(USE_CASE_MEDIA_SHELL_CLASS, className)}>{children}</div>
	);
}

export type UseCaseAudioDemoProps = {
	audioSrc: string;
	title: string;
	description?: string;
	footer?: string;
	userWaves: WaveSegment[];
	modelWaves: WaveSegment[];
	reasoningWindow: ReasoningWindow;
	durationFallback?: number;
	/** When true, pause this instance (e.g. another part started). */
	externalPaused?: boolean;
	onPlayingChange?: (playing: boolean) => void;
	className?: string;
	/** Dense layout for multi-part tiles inside the shared media shell. */
	compact?: boolean;
	/** Fill a parent UseCaseMediaShell (no own bg-primary / aspect). */
	embedded?: boolean;
};

export function UseCaseAudioDemo({
	audioSrc,
	title,
	description,
	footer = "Example conversation with Model, using Reasoning",
	userWaves,
	modelWaves,
	reasoningWindow,
	durationFallback = 30,
	externalPaused = false,
	onPlayingChange,
	className,
	compact = false,
	embedded = false,
}: UseCaseAudioDemoProps) {
	const markerId = useId().replace(/:/g, "");
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const playingRef = useRef(false);
	const audioReadyRef = useRef(false);
	const durationRef = useRef(durationFallback);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(durationFallback);
	const [audioReady, setAudioReady] = useState(false);

	const stopRaf = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	useEffect(() => {
		playingRef.current = playing;
		onPlayingChange?.(playing);
	}, [playing, onPlayingChange]);

	useEffect(() => {
		audioReadyRef.current = audioReady;
	}, [audioReady]);

	useEffect(() => {
		durationRef.current = duration;
	}, [duration]);

	useEffect(() => {
		if (externalPaused && playing) {
			audioRef.current?.pause();
			setPlaying(false);
		}
	}, [externalPaused, playing]);

	useEffect(() => {
		const audio = new Audio(audioSrc);
		audio.preload = "metadata";
		audioRef.current = audio;
		setPlaying(false);
		setProgress(0);
		setAudioReady(false);
		setDuration(durationFallback);

		const onLoaded = () => {
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				setDuration(audio.duration);
				setAudioReady(true);
			}
		};
		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
			stopRaf();
		};
		const onError = () => {
			setAudioReady(false);
		};

		audio.addEventListener("loadedmetadata", onLoaded);
		audio.addEventListener("ended", onEnded);
		audio.addEventListener("error", onError);

		return () => {
			stopRaf();
			audio.pause();
			audio.removeEventListener("loadedmetadata", onLoaded);
			audio.removeEventListener("ended", onEnded);
			audio.removeEventListener("error", onError);
			audioRef.current = null;
		};
	}, [audioSrc, durationFallback, stopRaf]);

	useEffect(() => {
		if (!playing) {
			stopRaf();
			return;
		}

		const tick = () => {
			const audio = audioRef.current;
			if (audio && audioReadyRef.current && !audio.paused) {
				setProgress(
					audio.duration > 0 ? audio.currentTime / audio.duration : 0,
				);
				rafRef.current = requestAnimationFrame(tick);
				return;
			}

			if (playingRef.current && !audioReadyRef.current) {
				setProgress((prev) => {
					const next = prev + 1 / (60 * durationRef.current);
					if (next >= 1) {
						setPlaying(false);
						return 0;
					}
					return next;
				});
				rafRef.current = requestAnimationFrame(tick);
			}
		};

		rafRef.current = requestAnimationFrame(tick);
		return () => stopRaf();
	}, [playing, stopRaf]);

	const togglePlayback = async () => {
		const audio = audioRef.current;

		if (playing) {
			audio?.pause();
			setPlaying(false);
			return;
		}

		if (audio && audioReady) {
			try {
				if (progress >= 0.995) {
					audio.currentTime = 0;
					setProgress(0);
				}
				await audio.play();
				setPlaying(true);
				return;
			} catch {
				// Fall through to silent timeline animation.
			}
		}

		if (progress >= 0.995) {
			setProgress(0);
		}
		setPlaying(true);
	};

	const seek = (ratio: number) => {
		const next = Math.min(1, Math.max(0, ratio));
		setProgress(next);
		const audio = audioRef.current;
		if (audio && audioReady) {
			audio.currentTime = next * audio.duration;
		}
	};

	const reasoningActive =
		progress >= reasoningWindow.start && progress <= reasoningWindow.end;

	const elapsed = progress * duration;
	const timeLabel = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

	return (
		<div
			className={cn(
				"text-white relative w-full overflow-hidden",
				embedded
					? "flex h-full min-h-0 flex-col justify-center"
					: "bg-primary rounded-xl",
				!embedded &&
					(compact
						? "px-3 py-6 sm:px-5 sm:py-8"
						: "px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12"),
				embedded && (compact ? "px-2 py-2 sm:px-3 sm:py-3" : "px-3 py-4 sm:px-8 sm:py-6 lg:px-12"),
				className,
			)}
		>
			<div
				className={cn(
					"mx-auto flex w-full flex-col items-center text-center",
					compact
						? "max-w-3xl gap-1.5 sm:gap-3"
						: "max-w-4xl gap-2 sm:gap-6",
					embedded && !compact && "gap-2 sm:gap-6 lg:gap-8",
				)}
			>
				<div
					className={cn(
						"flex flex-col items-center",
						compact ? "gap-0.5" : "gap-1.5 sm:gap-2",
					)}
				>
					<h2
						className={cn(
							"font-bold tracking-tight text-balance",
							compact
								? "text-xs sm:text-sm md:text-base"
								: "text-base sm:text-3xl lg:text-4xl",
						)}
					>
						{title}
					</h2>
					{description && !compact ? (
						<>
							{/* Mobile: pink voice orb instead of description copy */}
							<VoiceOrb
								state={playing ? "speaking" : "listening"}
								volume={playing ? 0.55 : 0.15}
								variant="pink"
								className="my-1 size-24 sm:hidden"
							/>
							<p className="text-white mx-auto hidden max-w-2xl text-sm text-pretty sm:block sm:text-base">
								{description}
							</p>
						</>
					) : null}
				</div>

				<div
					className={cn(
						"flex w-full items-stretch justify-center",
						compact
							? "gap-1.5 sm:gap-2"
							: "flex-col gap-2 sm:flex-row sm:gap-4",
					)}
				>
					<button
						type="button"
						aria-label={playing ? "Pause demo" : "Play demo"}
						onClick={togglePlayback}
						className={cn(
							"border-background/20 bg-background/10 text-background hover:bg-background/15 focus-visible:ring-background/40 flex shrink-0 items-center justify-center self-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none",
							compact
								? "size-10 sm:size-8"
								: "size-11 sm:mt-1 sm:size-11",
						)}
					>
						{playing ? (
							<PauseIcon
								className={cn(
									"fill-current",
									compact ? "size-4 sm:size-3" : "size-4",
								)}
							/>
						) : (
							<PlayIcon
								className={cn(
									"translate-x-px fill-current",
									compact ? "size-4 sm:size-3" : "size-4",
								)}
							/>
						)}
					</button>

					{/* Wave timelines — desktop/tablet only; mobile shows play button alone */}
					<div className="relative hidden min-w-0 flex-1 sm:block">
						<div className={cn("relative flex flex-col", compact ? "gap-1" : "gap-2")}>
							<Track label="User" tone="bg-white" compact={compact}>
								<Waveform
									segments={userWaves}
									segmentColor="bg-secondary"
									compact={compact}
								/>
							</Track>

							<Track label="Model" tone="bg-white" compact={compact}>
								<Waveform
									segments={modelWaves}
									segmentColor="bg-secondary"
									compact={compact}
								/>
							</Track>

							<Track label="Reasoning" tone="bg-white" compact={compact}>
								<div
									className={cn(
										"pointer-events-none absolute inset-y-0 right-0 flex items-center",
										timelineInsetClass(compact),
									)}
								>
									<div className="border-foreground/20 absolute inset-x-0 top-1/2 border-t border-dashed" />
									<div
										className={cn(
											"absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md border font-medium tracking-wide whitespace-nowrap transition-colors bg-secondary",
											compact
												? "h-5 text-[8px] sm:h-6 sm:text-[10px]"
												: "h-8 text-[10px] sm:h-9 sm:text-xs",
											reasoningActive
												? "border-foreground/50 bg-foreground/10 text-foreground"
												: "border-foreground/25 bg-transparent text-foreground/70",
										)}
										style={{
											left: `${reasoningWindow.start * 100}%`,
											width: `${(reasoningWindow.end - reasoningWindow.start) * 100}%`,
										}}
									>
										<SearchIcon
											className={cn(
												"text-primary",
												compact ? "size-3" : "size-4",
											)}
										/>
									</div>
								</div>
							</Track>

							<div
								className={cn(
									"absolute inset-y-0 right-0",
									timelineInsetClass(compact),
								)}
								role="slider"
								aria-label="Conversation timeline"
								aria-valuemin={0}
								aria-valuemax={Math.round(duration)}
								aria-valuenow={Math.round(elapsed)}
								aria-valuetext={timeLabel}
								tabIndex={0}
								onClick={(event) => {
									const rect =
										event.currentTarget.getBoundingClientRect();
									seek(
										(event.clientX - rect.left) /
											rect.width,
									);
								}}
								onKeyDown={(event) => {
									if (event.key === "ArrowRight") {
										seek(progress + 0.05);
									} else if (event.key === "ArrowLeft") {
										seek(progress - 0.05);
									}
								}}
							>
								<svg
									aria-hidden="true"
									focusable="false"
									className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
									viewBox="0 0 100 100"
									preserveAspectRatio="none"
								>
									<defs>
										<marker
											id={`demo-arrow-${markerId}`}
											viewBox="0 0 6 6"
											refX="3"
											refY="3"
											markerWidth="5"
											markerHeight="5"
											orient="auto"
										>
											<path
												d="M0,0 L6,3 L0,6 Z"
												fill="currentColor"
											/>
										</marker>
									</defs>
									<path
										d={`M ${reasoningWindow.start * 100} 38 L ${reasoningWindow.start * 100} 72`}
										stroke="currentColor"
										strokeWidth="0.35"
										fill="none"
										vectorEffect="non-scaling-stroke"
										markerEnd={`url(#demo-arrow-${markerId})`}
										className="text-foreground/45"
									/>
									<path
										d={`M ${reasoningWindow.end * 100} 72 L ${reasoningWindow.end * 100} 38`}
										stroke="currentColor"
										strokeWidth="0.35"
										fill="none"
										vectorEffect="non-scaling-stroke"
										markerEnd={`url(#demo-arrow-${markerId})`}
										className="text-foreground/45"
									/>
								</svg>

								{(playing || progress > 0) && (
									<div
										aria-hidden
										className="bg-foreground pointer-events-none absolute top-0 bottom-0 w-px"
										style={{
											left: `${progress * 100}%`,
										}}
									/>
								)}
							</div>
						</div>
					</div>
				</div>

				{footer && !compact ? (
					<p className="text-white text-xs sm:text-sm">{footer}</p>
				) : null}
			</div>
		</div>
	);
}

export function UseCaseAudioComingSoon({
	title,
	className,
	embedded = false,
}: {
	title: string;
	className?: string;
	embedded?: boolean;
}) {
	return (
		<div
			className={cn(
				"text-white relative flex w-full flex-col items-center justify-center overflow-hidden text-center",
				embedded
					? "h-full min-h-0 px-4"
					: "bg-primary rounded-xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12",
				className,
			)}
		>
			<h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
				{title}
			</h2>
			<p className="text-white/85 mt-3 max-w-md text-sm sm:text-base">
				Demo coming soon
			</p>
		</div>
	);
}

"use client";

import { cn } from "@repo/ui/utils";
import { SearchIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Drop your demo mix at this path (wav/mp3). Timeline still animates without it. */
const AUDIO_SRC = "/audio/hero-delegated.wav";
const DURATION_FALLBACK = 20.7;

type WaveSegment = {
	start: number;
	end: number;
	bars: number[];
};

const USER_WAVES: WaveSegment[] = [
	{
		start: 0.0,
		end: 0.12,
		bars: [0.35, 0.55, 0.8, 0.45, 0.7, 0.9, 0.5, 0.65, 0.4, 0.75, 0.55],
	},
	{
		start: 0.15,
		end: 0.31,
		bars: [
			0.4, 0.7, 0.55, 0.85, 0.5, 0.95, 0.6, 0.75, 0.45, 0.8, 0.55, 0.7,
		],
	},
];

const MODEL_WAVES: WaveSegment[] = [
	{
		start: 0.12,
		end: 0.15,
		bars: [0.45, 0.7, 0.55],
	},
	{
		start: 0.34,
		end: 0.4,
		bars: [0.4, 0.6, 0.8, 0.5, 0.7],
	},
	{
		start: 0.47,
		end: 0.99,
		bars: [
			0.5, 0.75, 0.45, 0.9, 0.6, 0.8, 0.55, 0.7, 0.95, 0.5, 0.65, 0.85,
			0.4, 0.75, 0.55, 0.9, 0.6, 0.7, 0.45, 0.8, 0.55, 0.75, 0.5, 0.85,
			0.65, 0.4, 0.7, 0.9, 0.55, 0.75, 0.45, 0.8, 0.6, 0.7, 0.5, 0.85,
		],
	},
];

const REASONING_WINDOW = { start: 0.4, end: 0.47 };

function Waveform({
	segments,
	segmentColor = "bg-foreground",
}: {
	segments: WaveSegment[];
	segmentColor?: string;
}) {
	return (
		<div className="pointer-events-none absolute inset-y-0 right-0 left-20 flex items-center sm:left-24">
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
	children,
}: {
	label: string;
	tone: string;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"relative h-14 overflow-hidden rounded-md sm:h-16",
				tone,
			)}
		>
			<span className="text-foreground absolute top-1/2 left-3 z-10 -translate-y-1/2 text-xs font-semibold tracking-wide sm:left-4 sm:text-sm">
				{label}
			</span>
			{children}
		</div>
	);
}

export function HeroDemo() {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const playingRef = useRef(false);
	const audioReadyRef = useRef(false);
	const durationRef = useRef(DURATION_FALLBACK);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(DURATION_FALLBACK);
	const [audioReady, setAudioReady] = useState(false);

	const stopRaf = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	useEffect(() => {
		playingRef.current = playing;
	}, [playing]);

	useEffect(() => {
		audioReadyRef.current = audioReady;
	}, [audioReady]);

	useEffect(() => {
		durationRef.current = duration;
	}, [duration]);

	useEffect(() => {
		const audio = new Audio(AUDIO_SRC);
		audio.preload = "metadata";
		audioRef.current = audio;

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
	}, [stopRaf]);

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
		progress >= REASONING_WINDOW.start && progress <= REASONING_WINDOW.end;

	const elapsed = progress * duration;
	const timeLabel = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

	return (
		<div className="bg-primary text-white relative w-full overflow-hidden rounded-xl px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
			<div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:gap-8">
				<div className="flex flex-col gap-2">
					<h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
						How it works
					</h2>
					<p className="text-white mx-auto max-w-2xl text-sm text-pretty sm:text-base">
						Optimind provides fast, natural responses, while
						Reasoning handles search in the background
					</p>
				</div>

				<div className="flex w-full items-stretch gap-3 sm:gap-4">
					<button
						type="button"
						aria-label={playing ? "Pause demo" : "Play demo"}
						onClick={togglePlayback}
						className="border-background/20 bg-background/10 text-background hover:bg-background/15 focus-visible:ring-background/40 mt-1 flex size-10 shrink-0 items-center justify-center self-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-11"
					>
						{playing ? (
							<PauseIcon className="size-4 fill-current" />
						) : (
							<PlayIcon className="size-4 translate-x-px fill-current" />
						)}
					</button>

					<div className="relative min-w-0 flex-1">
						<div className="relative flex flex-col gap-2">
							<Track label="User" tone="bg-white">
								<Waveform
									segments={USER_WAVES}
									segmentColor="bg-secondary"
								/>
							</Track>

							<Track label="Model" tone="bg-white">
								<Waveform
									segments={MODEL_WAVES}
									segmentColor="bg-secondary"
								/>
							</Track>

							<Track label="Reasoning" tone="bg-white">
								<div className="pointer-events-none absolute inset-y-0 right-0 left-20 flex items-center sm:left-24">
									<div className="border-foreground/20 absolute inset-x-0 top-1/2 border-t border-dashed" />
									<div
										className={cn(
											"absolute top-1/2 flex h-8 -translate-y-1/2 items-center justify-center rounded-md border text-[10px] font-medium tracking-wide whitespace-nowrap transition-colors sm:h-9 sm:text-xs bg-secondary",
											reasoningActive
												? "border-foreground/50 bg-foreground/10 text-foreground"
												: "border-foreground/25 bg-transparent text-foreground/70",
										)}
										style={{
											left: `${REASONING_WINDOW.start * 100}%`,
											width: `${(REASONING_WINDOW.end - REASONING_WINDOW.start) * 100}%`,
										}}
									>
										<SearchIcon className="w-4 h-4 text-primary" />
									</div>
								</div>
							</Track>

							{/* Timeline scrubber: starts where dotted lines start (after labels), not at first speech */}
							<div
								className="absolute inset-y-0 right-0 left-20 sm:left-24"
								role="slider"
								aria-label="Delegated reasoning interaction timeline"
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
								{/* Delegation arrows in timeline coords */}
								<svg
									aria-hidden
									aria-label="Delegation arrows in timeline coords"
									className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
									viewBox="0 0 100 100"
									preserveAspectRatio="none"
								>
									<defs>
										<marker
											id="hero-demo-arrow"
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
										d={`M ${REASONING_WINDOW.start * 100} 38 L ${REASONING_WINDOW.start * 100} 72`}
										stroke="currentColor"
										strokeWidth="0.35"
										fill="none"
										vectorEffect="non-scaling-stroke"
										markerEnd="url(#hero-demo-arrow)"
										className="text-foreground/45"
									/>
									<path
										d={`M ${REASONING_WINDOW.end * 100} 72 L ${REASONING_WINDOW.end * 100} 38`}
										stroke="currentColor"
										strokeWidth="0.35"
										fill="none"
										vectorEffect="non-scaling-stroke"
										markerEnd="url(#hero-demo-arrow)"
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

				<p className="text-white text-xs sm:text-sm">
					Example conversation with Model, using Reasoning
				</p>
			</div>
		</div>
	);
}

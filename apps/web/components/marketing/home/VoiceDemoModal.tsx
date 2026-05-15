import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@repo/ui/dialog";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type TranscriptLine = {
	t: number; // seconds
	who: "ai" | "user";
	text: string;
};

export type DemoData = {
	title: string;
	caller: string;
	duration: number; // seconds
	lines: TranscriptLine[];
};

export function VoiceDemoModal({
	open,
	onOpenChange,
	demo,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	demo: DemoData | null;
}) {
	const [playing, setPlaying] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const rafRef = useRef<number | null>(null);
	const startRef = useRef<number>(0);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const oscRef = useRef<{ stop: () => void } | null>(null);

	// Reset on demo change / close
	useEffect(() => {
		setPlaying(false);
		setElapsed(0);
		return () => stopTone();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [demo, open]);

	function stopTone() {
		if (oscRef.current) {
			try {
				oscRef.current.stop();
			} catch {
				/* noop */
			}
			oscRef.current = null;
		}
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
	}

	function playTone() {
		if (typeof window === "undefined" || !demo) return;
		const Ctx =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
		const ctx = audioCtxRef.current;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = 220;
		lfo.frequency.value = 4.5;
		lfoGain.gain.value = 60;
		lfo.connect(lfoGain).connect(osc.frequency);
		gain.gain.value = 0.04;
		osc.connect(gain).connect(ctx.destination);
		osc.start();
		lfo.start();
		oscRef.current = {
			stop: () => {
				try {
					osc.stop();
				} catch {
					/* noop */
				}
				try {
					lfo.stop();
				} catch {
					/* noop */
				}
			},
		};
	}

	function handlePlay() {
		if (!demo) return;
		if (playing) {
			setPlaying(false);
			stopTone();
			return;
		}
		setPlaying(true);
		startRef.current = performance.now() - elapsed * 1000;
		playTone();
		const tick = () => {
			const e = (performance.now() - startRef.current) / 1000;
			if (e >= demo.duration) {
				setElapsed(demo.duration);
				setPlaying(false);
				stopTone();
				return;
			}
			setElapsed(e);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
	}

	const progress = demo ? Math.min(1, elapsed / demo.duration) : 0;

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) stopTone();
				onOpenChange(v);
			}}
		>
			<DialogContent className="max-w-2xl border-border bg-background p-0 sm:rounded-none">
				{demo && (
					<div className="flex flex-col">
						<div className="flex items-center justify-between border-b border-border px-6 py-4">
							<div>
								<DialogTitle className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
									/demo · {demo.caller}
								</DialogTitle>
								<DialogDescription className="mt-1 font-display text-2xl text-foreground">
									{demo.title}
								</DialogDescription>
							</div>
							<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-signal">
								<span
									className={`h-1.5 w-1.5 rounded-full bg-signal ${playing ? "animate-pulse" : "opacity-40"}`}
								/>
								{playing ? "live" : "paused"}
							</div>
						</div>

						{/* Waveform */}
						<div className="border-b border-border px-6 py-6">
							<div className="flex h-16 items-center gap-[3px]">
								{Array.from({ length: 64 }).map((_, i) => {
									const active = i / 64 <= progress;
									const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
									const h =
										20 +
										seed * 70 +
										(playing && active
											? Math.sin(elapsed * 6 + i) * 10
											: 0);
									return (
										<div
											key={i}
											style={{
												height: `${Math.max(8, Math.min(100, h))}%`,
											}}
											className={`w-[3px] rounded-full transition-colors ${active ? "bg-signal" : "bg-border"}`}
										/>
									);
								})}
							</div>
							<div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
								{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
								<button
									onClick={handlePlay}
									className="flex items-center gap-3 rounded-full border border-signal/40 px-4 py-2 text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
								>
									<span>
										{playing ? "❚❚ pause" : "▶ play sample"}
									</span>
								</button>
								<div>
									{fmt(elapsed)} / {fmt(demo.duration)}
								</div>
							</div>
						</div>

						{/* Transcript */}
						<div className="max-h-[40vh] overflow-y-auto px-6 py-6">
							<div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
								live transcript
							</div>
							<div className="space-y-4">
								<AnimatePresence initial={false}>
									{demo.lines
										.filter(
											(l) =>
												elapsed >= l.t ||
												(!playing && elapsed === 0),
										)
										.map((l, i) => (
											<motion.div
												key={`${l.t}-${i}`}
												initial={{ opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.4 }}
												className="grid grid-cols-[64px_1fr] gap-4"
											>
												<div
													className={`font-mono text-[10px] uppercase tracking-widest ${l.who === "ai" ? "text-signal" : "text-pulse"}`}
												>
													{l.who === "ai"
														? "sashflow"
														: "patient"}
													<div className="mt-1 text-muted-foreground">
														{fmt(l.t)}
													</div>
												</div>
												<p className="text-sm leading-relaxed text-foreground">
													{l.text}
												</p>
											</motion.div>
										))}
								</AnimatePresence>
								{!playing && elapsed === 0 && (
									<p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
										press play — synthesized preview tone,
										real audio in pilot
									</p>
								)}
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function fmt(s: number) {
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, "0")}`;
}

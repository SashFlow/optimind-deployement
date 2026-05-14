import { motion } from "motion/react";

const items = [
	"00:00:14 — Patient intake",
	"Triage complete",
	"00:00:42 — Outbound campaign",
	"Symptom captured",
	"00:01:08 — Class transcribed",
	"Report drafted",
	"00:00:09 — Support resolved",
	"Vitals confirmed",
];

export function Marquee() {
	return (
		<div className="relative overflow-hidden border-y border-border bg-card/40 py-4">
			<motion.div
				className="flex gap-12 whitespace-nowrap font-mono text-xs uppercase tracking-widest text-muted-foreground"
				animate={{ x: ["0%", "-50%"] }}
				transition={{
					duration: 40,
					repeat: Number.POSITIVE_INFINITY,
					ease: "linear",
				}}
			>
				{[...items, ...items, ...items].map((it, i) => (
					<span key={i} className="flex items-center gap-12">
						<span className="text-signal">◉</span>
						{it}
					</span>
				))}
			</motion.div>
		</div>
	);
}

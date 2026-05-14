/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
"use client";
/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
import { Marquee } from "@components/marketing/home/Marquee";
import {
	type DemoData,
	VoiceDemoModal,
} from "@components/marketing/home/VoiceDemoModal";
import { VoiceOrb } from "@components/marketing/home/VoiceOrb";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
// import heroWave from "@/assets/hero-wave.jpg";

export default function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	// const { locale } = await params;
	// setRequestLocale(locale);
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});
	const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
	const [activeDemo, setActiveDemo] = useState<DemoData | null>(null);

	return (
		<div className="min-h-screen bg-background text-foreground noise">
			{/* NAV */}
			<header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
					<a
						href="/"
						className="flex items-center gap-2 font-display text-2xl"
					>
						<span className="inline-block h-2 w-2 rounded-full bg-signal" />
						Auralis
					</a>
					<nav className="hidden gap-8 font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
						<a href="#use-cases" className="hover:text-foreground">
							Use cases
						</a>
						<a href="#metrics" className="hover:text-foreground">
							Metrics
						</a>
						<a href="#contact" className="hover:text-foreground">
							Contact
						</a>
					</nav>
					<div className="flex gap-2">
						<a
							href="#contact"
							className="rounded-full border border-signal/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
						>
							Book pilot
						</a>
						<a
							href="/auth/login"
							className="rounded-full border border-signal/30 px-4 py-2 font-mono text-xs uppercase tracking-widest text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
						>
							Login
						</a>
					</div>
				</div>
			</header>

			{/* HERO */}
			<section className="relative grid-bg pt-32 pb-24">
				<div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 lg:grid-cols-12">
					<div className="lg:col-span-7">
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
						>
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pulse" />
							Now in clinical pilot · Berlin, Singapore
						</motion.div>
						<motion.h1
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1, delay: 0.1 }}
							className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.92] text-balance"
						>
							The voice that
							<br />
							<em className="text-signal">listens like</em> a
							<br />
							clinician.
						</motion.h1>
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 1, delay: 0.4 }}
							className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground"
						>
							Auralis is a voice AI engineered for the moments
							other models fluff: an elderly patient describing
							chest pain, a med student lost in a lecture, a
							radiology report that reads like Latin. Built for
							medicine. Useful everywhere else.
						</motion.p>
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.6 }}
							className="mt-10 flex flex-wrap gap-3"
						>
							<a
								href="#contact"
								className="group inline-flex items-center gap-3 rounded-full bg-signal px-6 py-3 font-mono text-sm uppercase tracking-widest text-primary-foreground transition-all hover:gap-5 glow-signal"
							>
								Hear it speak
								<span aria-hidden>→</span>
							</a>
							<a
								href="#use-cases"
								className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-mono text-sm uppercase tracking-widest text-foreground transition-colors hover:border-signal/40"
							>
								Six use cases
							</a>
						</motion.div>
					</div>

					<div className="relative lg:col-span-5">
						<div className="aspect-square w-full">
							<VoiceOrb />
						</div>
						<div className="absolute left-0 top-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
							<div>● live</div>
							<div className="mt-1 text-signal">
								audio.in 48khz
							</div>
						</div>
						<div className="absolute bottom-4 right-0 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
							<div>session #A-2249</div>
							<div className="mt-1 text-pulse">latency 612ms</div>
						</div>
					</div>
				</div>
			</section>

			<Marquee />

			{/* METRICS */}
			<section id="metrics" className="border-b border-border py-24">
				<div className="mx-auto max-w-7xl px-6">
					<div className="mb-16 flex items-end justify-between">
						<div>
							<div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
								/002 — instrumentation
							</div>
							<h2 className="mt-3 font-display text-5xl md:text-6xl text-balance">
								Numbers, not{" "}
								<em className="text-signal">narratives.</em>
							</h2>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
						{features.map((f, i) => (
							<motion.div
								key={f.k}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.1 }}
								className="bg-background p-8"
							>
								<div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
									{f.k}
								</div>
								<div className="mt-4 font-display text-5xl text-signal">
									{f.v}
								</div>
								<div className="mt-2 text-xs text-muted-foreground">
									{f.note}
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* USE CASES */}
			<section id="use-cases" ref={ref} className="relative py-32">
				{/* <motion.div
					style={{ y, backgroundImage: `url(${heroWave})` }}
					className="absolute inset-0 -z-10 bg-cover bg-center opacity-20"
				/> */}
				<div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/60 to-background" />
				<div className="mx-auto max-w-7xl px-6">
					<div className="mb-20 max-w-3xl">
						<div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
							/003 — surfaces
						</div>
						<h2 className="mt-3 font-display text-5xl md:text-7xl text-balance">
							Six places where a generic{" "}
							<em className="text-pulse">chatbot fails.</em>
						</h2>
					</div>

					<div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
						{useCases.map((u, i) => (
							<motion.button
								key={u.n}
								type="button"
								onClick={() => setActiveDemo(u.demo)}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-80px" }}
								transition={{
									duration: 0.6,
									delay: (i % 3) * 0.1,
								}}
								className="group relative bg-background p-8 text-left transition-colors hover:bg-card focus:outline-none focus-visible:ring-1 focus-visible:ring-signal"
							>
								<div className="flex items-start justify-between">
									<span className="font-mono text-xs text-signal">
										{u.n}
									</span>
									<span className="font-mono text-xs uppercase tracking-widest text-signal opacity-0 transition-opacity group-hover:opacity-100">
										▶ hear demo
									</span>
								</div>
								<h3 className="mt-12 font-display text-3xl text-balance">
									{u.title}
								</h3>
								<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
									{u.body}
								</p>
								<div className="mt-12 flex items-center justify-between">
									<div className="h-px w-12 bg-signal transition-all duration-500 group-hover:w-32" />
									<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
										{u.demo.lines.length} turns ·{" "}
										{Math.round(u.demo.duration)}s
									</span>
								</div>
							</motion.button>
						))}
					</div>
				</div>
			</section>

			{/* CONTACT */}
			<ContactSection />

			{/* FOOTER */}
			<footer className="border-t border-border py-12">
				<div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
					<div className="font-display text-xl">
						Auralis<span className="text-signal">.</span>
					</div>
					<div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						© 2026 — built quietly, deployed loudly
					</div>
				</div>
			</footer>

			<VoiceDemoModal
				open={activeDemo !== null}
				onOpenChange={(v) => {
					if (!v) setActiveDemo(null);
				}}
				demo={activeDemo}
			/>
		</div>
	);
}

const useCases: Array<{
	n: string;
	title: string;
	body: string;
	demo: DemoData;
}> = [
	{
		n: "01",
		title: "Medical Examination",
		body: "Conversational triage that listens, probes, and structures findings into SOAP notes — handed to clinicians, never replacing them.",
		demo: {
			title: "Chest pain triage, 71yo",
			caller: "intake · room 3",
			duration: 18,
			lines: [
				{
					t: 0.2,
					who: "ai",
					text: "Good morning Mr. Hale. Before the doctor sees you, can you describe the chest discomfort in your own words?",
				},
				{
					t: 4.5,
					who: "user",
					text: "It's a tightness, here, started after breakfast. Comes and goes.",
				},
				{
					t: 9,
					who: "ai",
					text: "Is it sharp or more like a pressure? Does it move to your arm or jaw?",
				},
				{
					t: 13,
					who: "user",
					text: "Pressure. Goes a little into my left shoulder.",
				},
				{
					t: 16,
					who: "ai",
					text: "Noted. Flagging as possible cardiac — Dr. Okafor will be with you in two minutes.",
				},
			],
		},
	},
	{
		n: "02",
		title: "Inbound Calls",
		body: "Answers in 600ms with the warmth of a front-desk veteran. Books, reschedules, escalates — fluent in 38 languages.",
		demo: {
			title: "Reschedule + insurance check",
			caller: "inbound · +49 30 ···",
			duration: 16,
			lines: [
				{
					t: 0.2,
					who: "ai",
					text: "Charité dermatology, this is Auralis — how can I help?",
				},
				{
					t: 3,
					who: "user",
					text: "I need to move my Thursday appointment. Also, do you take TK?",
				},
				{
					t: 7,
					who: "ai",
					text: "Of course. I see Thursday 14:00 with Dr. Lange. Next openings are Tuesday 09:30 or Friday 11:00.",
				},
				{ t: 12, who: "user", text: "Friday works." },
				{
					t: 14,
					who: "ai",
					text: "Booked. And yes — TK is in network, no referral needed.",
				},
			],
		},
	},
	{
		n: "03",
		title: "Outbound Calls",
		body: "Follow-ups, no-show recovery, post-op check-ins. Each call adapts tone to the patient's history, not a script.",
		demo: {
			title: "Day-3 post-op check-in",
			caller: "outbound · ortho",
			duration: 17,
			lines: [
				{
					t: 0.2,
					who: "ai",
					text: "Hi Maria, it's Auralis from Dr. Patel's office — quick check on day three after the knee scope?",
				},
				{
					t: 5,
					who: "user",
					text: "Swelling is down but I'm still pretty sore at night.",
				},
				{
					t: 9,
					who: "ai",
					text: "That tracks for day three. Are you icing twenty minutes, four times a day?",
				},
				{ t: 13, who: "user", text: "More like twice." },
				{
					t: 15,
					who: "ai",
					text: "Bump it to four — I'll text the schedule and let Dr. Patel know.",
				},
			],
		},
	},
	{
		n: "04",
		title: "Customer Support",
		body: "Resolves tier-1 in seconds with full memory of the account. Hands warm-transferred context to a human when nuance demands it.",
		demo: {
			title: "Billing dispute, account #4471",
			caller: "support · tier-1",
			duration: 15,
			lines: [
				{
					t: 0.2,
					who: "ai",
					text: "Hi Jonas — I see two charges on Tuesday. Want me to walk through them?",
				},
				{
					t: 4,
					who: "user",
					text: "Yeah, the second one looks duplicate.",
				},
				{
					t: 7,
					who: "ai",
					text: "It is — same merchant, 11 seconds apart. I've reversed it; funds back in two business days.",
				},
				{ t: 12, who: "user", text: "That easy?" },
				{
					t: 13.5,
					who: "ai",
					text: "That easy. Anything else on the account?",
				},
			],
		},
	},
	{
		n: "05",
		title: "Medical Classes",
		body: "Live transcription of lectures with anatomical disambiguation, drug-name precision, and instant searchable study packs.",
		demo: {
			title: "Pharmacology lecture · ACE inhibitors",
			caller: "lecture · UMC week 9",
			duration: 16,
			lines: [
				{
					t: 0.2,
					who: "user",
					text: "...so lisinopril blocks angiotensin-converting enzyme — note the spelling, two i's.",
				},
				{
					t: 6,
					who: "ai",
					text: "Captured: lisinopril (ACE-I). Linked to Goodman & Gilman ch. 26.",
				},
				{
					t: 10,
					who: "user",
					text: "Side effect to remember: dry cough, roughly 10% of patients.",
				},
				{
					t: 13.5,
					who: "ai",
					text: "Flashcard generated · cough · bradykinin accumulation.",
				},
			],
		},
	},
	{
		n: "06",
		title: "Report Explainer",
		body: "Reads a radiology or lab report aloud in the patient's own vocabulary. Answers follow-ups with cited sources, not vibes.",
		demo: {
			title: "MRI lumbar spine · plain-language read",
			caller: "patient portal",
			duration: 17,
			lines: [
				{
					t: 0.2,
					who: "ai",
					text: "Your MRI shows a small bulge at L4-L5 — think of it as a slightly squeezed cushion between two vertebrae.",
				},
				{ t: 7, who: "user", text: "Is that why my leg tingles?" },
				{
					t: 10,
					who: "ai",
					text: "Likely yes. The bulge sits near the nerve that runs down your left leg. Most cases improve with PT in 6-8 weeks.",
				},
				{ t: 15, who: "user", text: "Do I need surgery?" },
				{
					t: 16,
					who: "ai",
					text: "Not based on this scan. I'll send Dr. Chen a note to confirm.",
				},
			],
		},
	},
];

const features = [
	{ k: "Latency", v: "612ms", note: "median first-token, EU edge" },
	{ k: "Languages", v: "38", note: "incl. clinical accents" },
	{ k: "WER, noisy", v: "3.8%", note: "word error in OR ambient" },
	{ k: "Compliance", v: "HIPAA · GDPR", note: "BAA day one" },
];

function ContactSection() {
	const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
	const [errors, setErrors] = useState<Record<string, string>>({});

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});
		setStatus("ok");
		e.currentTarget.reset();
	}

	return (
		<section
			id="contact"
			className="border-t border-border bg-card/30 py-32"
		>
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 lg:grid-cols-12">
				<div className="lg:col-span-5">
					<div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						/004 — open a line
					</div>
					<h2 className="mt-3 font-display text-5xl md:text-6xl text-balance">
						Tell us what you're{" "}
						<em className="text-signal">trying to hear.</em>
					</h2>
					<p className="mt-8 max-w-md text-muted-foreground">
						Pilots start at four weeks. We'll send a sample call
						from your specialty within 48 hours — no decks, no
						pricing PDFs.
					</p>
					<div className="mt-10 space-y-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
						<div>
							<span className="text-signal">↳ </span>
							hello@auralis.health
						</div>
						<div>
							<span className="text-signal">↳ </span>Berlin ·
							Singapore · NYC
						</div>
					</div>
				</div>

				<form
					onSubmit={onSubmit}
					className="space-y-6 lg:col-span-7"
					noValidate
				>
					<Field label="Name" name="name" error={errors.name} />
					<Field
						label="Email"
						name="email"
						type="email"
						error={errors.email}
					/>
					<Field
						label="Organization"
						name="org"
						error={errors.org}
						optional
					/>
					<div>
						<label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
							The use case
						</label>
						<textarea
							name="message"
							rows={5}
							maxLength={1000}
							className="mt-2 w-full resize-none border-0 border-b border-border bg-transparent py-3 text-foreground placeholder:text-muted-foreground/40 focus:border-signal focus:outline-none focus:ring-0"
							placeholder="e.g. inbound triage for a 14-clinic dermatology group"
						/>
						{errors.message && (
							<p className="mt-2 text-xs text-pulse">
								{errors.message}
							</p>
						)}
					</div>
					<button
						type="submit"
						className="group inline-flex items-center gap-3 rounded-full bg-signal px-8 py-4 font-mono text-sm uppercase tracking-widest text-primary-foreground transition-all hover:gap-5 glow-signal"
					>
						Send transmission
						<span aria-hidden>→</span>
					</button>
					{status === "ok" && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="font-mono text-xs uppercase tracking-widest text-signal"
						>
							◉ received — we'll reply within 48h
						</motion.p>
					)}
				</form>
			</div>
		</section>
	);
}

function Field({
	label,
	name,
	type = "text",
	error,
	optional,
}: {
	label: string;
	name: string;
	type?: string;
	error?: string;
	optional?: boolean;
}) {
	return (
		<div>
			<label className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
				{label}
				{optional && (
					<span className="text-muted-foreground/40">— optional</span>
				)}
			</label>
			<input
				name={name}
				type={type}
				maxLength={255}
				className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-foreground placeholder:text-muted-foreground/40 focus:border-signal focus:outline-none focus:ring-0"
			/>
			{error && <p className="mt-2 text-xs text-pulse">{error}</p>}
		</div>
	);
}

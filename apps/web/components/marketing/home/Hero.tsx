import Link from "next/link";
import { StaggerContainer, StaggerItem } from "../shared/Motion";

export function Hero() {
	return (
		<>
			<div className="absolute inset-0 w-full h-full -z-20">
				<video
					autoPlay
					loop
					muted
					playsInline
					className="w-full h-full object-cover pointer-events-none"
				>
					<source src="/video/Background.mov" type="video/mp4" />
				</video>
				{/* Blur overlay */}
				<div className="absolute inset-0 backdrop-blur-md bg-black/20" />
				{/* Gradient to black transition at bottom */}
				<div className="absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-background to-transparent" />
			</div>

			<section
				id="about"
				className="relative px-8 max-w-7xl mx-auto mb-32 lg:mb-48 pt-16 min-h-[80vh] flex items-center"
			>
				<div className="absolute inset-0 bg-linear-to-b from-transparent to-surface -z-10 pointer-events-none" />

				<StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end relative z-10 w-full">
					<StaggerItem className="lg:col-span-8">
						<h1 className="editorial-headline uppercase text-6xl md:text-8xl lg:text-9xl mb-8 text-secondary-foreground">
							AI Infrastructure
							<br />
							for Traditional
							<br />
							<span className="text-primary">Industries</span>
						</h1>
					</StaggerItem>
					<StaggerItem className="lg:col-span-4 pb-4">
						<p className="font-approachable text-lg leading-relaxed text-secondary-foreground mb-8 border-l-4 border-accent pl-6">
							SashFlow builds AI-powered products for industries
							like HVAC, Legal, Healthcare, Real Estate, and
							Insurance — from concept to application-ready in 4
							weeks.
						</p>
						<div className="flex flex-wrap gap-4">
							<Link
								href="/contact"
								className="bg-primary text-primary-foreground px-8 py-4 font-approachable font-bold uppercase text-sm tracking-widest hover:brightness-110 transition-all inline-block text-center"
							>
								Get in Touch
							</Link>
							<Link
								href="#industries"
								className="bg-surface-container-highest text-secondary-foreground px-8 py-4 font-approachable font-bold uppercase text-sm tracking-widest hover:bg-surface-variant transition-all inline-block text-center"
							>
								See What We Build
							</Link>
						</div>
						<p className="mt-8 font-approachable text-xs font-semibold uppercase tracking-widest opacity-60 text-secondary-foreground">
							Built by a team with 25+ years of combined
							experience.
						</p>
					</StaggerItem>
				</StaggerContainer>
			</section>
		</>
	);
}

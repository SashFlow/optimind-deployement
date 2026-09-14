"use client";

import { HeroDemo } from "@/components/marketing/home/hero-demo";
import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import React from "react";

export const Hero = () => {
	const router = useRouter();
	return (
		<section id="hero" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
					<span className="border-border bg-background rounded-4xl border px-2 py-0.5 text-xs font-medium">
						New features released
					</span>
					<h1 className="text-4xl font-medium tracking-tight text-balance lg:text-6xl">
						AI for insurance and healthcare
					</h1>
					<p className="text-muted-foreground max-w-xl text-lg text-pretty">
						Optimind turns MER calls, claims updates, and patient
						conversations into natural voice experiences that scale
						with demand.
					</p>
					<div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row">
						<Button
							variant="default"
							size="default"
							onClick={() => router.push("#contact")}
						>
							Get Started
						</Button>
					</div>
				</div>
				<HeroDemo />
			</div>
		</section>
	);
};
export default Hero;

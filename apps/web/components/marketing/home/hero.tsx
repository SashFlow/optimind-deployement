import { Button } from "@repo/ui/button";
import Image from "next/image";
import React from "react";

export const Hero = () => {
	return (
		<section id="hero" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
					<span className="border-border bg-background rounded-4xl border px-2 py-0.5 text-xs font-medium">
						New features released
					</span>
					<h1 className="text-4xl font-medium tracking-tight text-balance lg:text-6xl">
						Make Better Decisions, With Ease
					</h1>
					<p className="text-muted-foreground max-w-xl text-lg text-pretty">
						Acme Inc's personal AI helps you cut through the noise,
						speed up delivery, and stay focused without switching
						contexts.
					</p>
					<div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row">
						<Button variant="default" size="default">
							Get Started
						</Button>
					</div>
				</div>
				<div className="bg-muted relative aspect-5/3 w-full overflow-hidden rounded-xl">
					<Image
						alt="Product showcase"
						className="object-cover"
						src="https://tweakcn.com/examples/marketing/hero.webp"
						fill
					/>
				</div>
			</div>
		</section>
	);
};
export default Hero;

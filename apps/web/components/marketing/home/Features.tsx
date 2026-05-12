"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";
import { featuresStrengths } from "../../../constants";

const Word = ({
	children,
	progress,
	range,
}: {
	children: string;
	progress: any;
	range: [number, number];
}) => {
	const opacity = useTransform(progress, range, [0, 1]);
	return (
		<span className="relative inline-block mr-[0.25em] mt-1">
			<span className="opacity-20">{children}</span>
			<motion.span style={{ opacity }} className="absolute left-0 top-0">
				{children}
			</motion.span>
		</span>
	);
};

const AnimatedParagraph = ({
	text,
	className,
}: {
	text: string;
	className?: string;
}) => {
	const container = useRef<HTMLParagraphElement>(null);
	const { scrollYProgress } = useScroll({
		target: container,
		offset: ["start 0.9", "start 0.4"],
	});

	const words = text.split(" ");
	return (
		<p ref={container} className={className}>
			{words.map((word, i) => {
				const start = i / words.length;
				const end = start + 1 / words.length;
				return (
					<Word
						key={i}
						progress={scrollYProgress}
						range={[start, end]}
					>
						{word}
					</Word>
				);
			})}
		</p>
	);
};

export function Features() {
	const containerRef = useRef<HTMLDivElement>(null);
	const height = 2400;

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 10%", "end 50%"],
	});

	const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
	const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
	return (
		<section
			id="features"
			className="py-32 px-8 bg-background overflow-hidden"
		>
			<div
				ref={containerRef}
				className="h-[2400px] relative max-w-7xl mx-auto"
			>
				<div
					style={{
						height: height + "px",
					}}
					className="absolute top-0 left-1/2 -translate-x-1/2 z-10 overflow-hidden w-[2px] bg-linear-to-b from-transparent from-0% via-neutral-200 dark:via-neutral-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
				>
					<motion.div
						style={{
							height: heightTransform,
							opacity: opacityTransform,
						}}
						className="absolute inset-x-0 top-0 w-[2px] bg-linear-to-t from-primary via-primary to-transparent from-0% via-10% rounded-full"
					/>
				</div>

				<div className="relative z-20 h-full flex flex-col justify-around py-32">
					{featuresStrengths.map((item, index) => {
						const isLeft = index % 2 === 0;
						return (
							<div
								key={index}
								className={`w-[45%] ${
									isLeft
										? "self-start text-right pr-8 lg:pr-16"
										: "self-end text-left pl-8 lg:pl-16"
								}`}
							>
								<AnimatedParagraph
									text={item.title}
									className="font-approachable text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground"
								/>
								<AnimatedParagraph
									text={item.subheading}
									className="font-approachable text-xl md:text-2xl text-foreground/70"
								/>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

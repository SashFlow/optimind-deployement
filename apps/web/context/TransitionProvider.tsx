"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import { TransitionRouter } from "next-transition-router";
import { startTransition, useRef } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
	const firstLayer = useRef<HTMLDivElement | null>(null);
	const secondLayer = useRef<HTMLDivElement | null>(null);

	return (
		<LazyMotion features={domAnimation}>
			<TransitionRouter
				leave={(next, from, to) => {
					console.log({ from, to });
					let tl: any;
					let isKilled = false;

					import("gsap").then(({ gsap }) => {
						if (isKilled) {
							next();
							return;
						}
						tl = gsap
							.timeline({
								onComplete: next,
							})
							.fromTo(
								firstLayer.current,
								{ y: "100%" },
								{
									y: 0,
									duration: 0.5,
									ease: "circ.inOut",
								},
							)
							.fromTo(
								secondLayer.current,
								{
									y: "100%",
								},
								{
									y: 0,
									duration: 0.5,
									ease: "circ.inOut",
								},
								"<50%",
							);
					});

					return () => {
						isKilled = true;
						if (tl) tl.kill();
					};
				}}
				enter={(next) => {
					let tl: any;
					let isKilled = false;

					import("gsap").then(({ gsap }) => {
						if (isKilled) {
							startTransition(next);
							return;
						}
						tl = gsap
							.timeline()
							.fromTo(
								secondLayer.current,
								{ y: 0 },
								{
									y: "-100%",
									duration: 0.5,
									ease: "circ.inOut",
								},
							)
							.fromTo(
								firstLayer.current,
								{ y: 0 },
								{
									y: "-100%",
									duration: 0.5,
									ease: "circ.inOut",
								},
								"<50%",
							)
							.call(
								() => {
									if (!isKilled) {
										// Defer React updates to prevent jank during animation
										requestAnimationFrame(() => {
											startTransition(next);
										});
									}
								},
								undefined,
								"<50%",
							);
					});

					return () => {
						isKilled = true;
						if (tl) tl.kill();
					};
				}}
			>
				{children}
				<div
					ref={firstLayer}
					className="fixed inset-0 z-50 translate-y-full bg-primary"
				/>
				<div
					ref={secondLayer}
					className="fixed inset-0 z-50 translate-y-full bg-background"
				/>
			</TransitionRouter>
		</LazyMotion>
	);
}

export default Providers;

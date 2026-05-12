"use client";

import { type PropsWithChildren, useEffect } from "react";

export function SmoothScroll({ children }: PropsWithChildren) {
	useEffect(() => {
		let lenisInstance: any;
		let rafId: number;

		import("lenis").then(({ default: Lenis }) => {
			lenisInstance = new Lenis();

			function raf(time: number) {
				lenisInstance.raf(time);
				rafId = requestAnimationFrame(raf);
			}

			rafId = requestAnimationFrame(raf);
		});

		return () => {
			if (lenisInstance) {
				lenisInstance.destroy();
			}
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
		};
	}, []);
	return <>{children}</>;
}

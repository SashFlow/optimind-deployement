"use client";

import { useEffect, useState } from "react";

/**
 * Detects virtual-keyboard open state via the Visual Viewport API.
 * Useful on mobile so fixed chrome can hide and focused fields stay visible.
 */
export function useVisualViewportKeyboard(thresholdPx = 120) {
	const [keyboardOpen, setKeyboardOpen] = useState(false);
	const [keyboardInset, setKeyboardInset] = useState(0);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const vv = window.visualViewport;
		if (!vv) {
			return;
		}

		const update = () => {
			const inset = Math.max(
				0,
				window.innerHeight - vv.height - vv.offsetTop,
			);
			setKeyboardInset(inset);
			setKeyboardOpen(inset > thresholdPx);
		};

		update();
		vv.addEventListener("resize", update);
		vv.addEventListener("scroll", update);
		window.addEventListener("focusin", update);
		window.addEventListener("focusout", update);
		return () => {
			vv.removeEventListener("resize", update);
			vv.removeEventListener("scroll", update);
			window.removeEventListener("focusin", update);
			window.removeEventListener("focusout", update);
		};
	}, [thresholdPx]);

	return { keyboardOpen, keyboardInset };
}

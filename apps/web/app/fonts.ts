import localFont from "next/font/local";

/**
 * Platform default font (Nunito), self-hosted via next/font/local.
 * Avoids next/font/google + Turbopack failures on extensionless Google Font URLs
 * (vercel/next.js#99114) while keeping the same Document className/variable wiring.
 */
export const nunito = localFont({
	src: [
		{
			path: "./fonts/nunito-latin-wght-normal.woff2",
			weight: "200 1000",
			style: "normal",
		},
		{
			path: "./fonts/nunito-latin-wght-italic.woff2",
			weight: "200 1000",
			style: "italic",
		},
	],
	variable: "--font-nunito",
	display: "swap",
});

// app/fonts.ts
import { Nunito } from "next/font/google";
import localFont from "next/font/local";

export const poppins = localFont({
	src: [
		{
			path: "../public/fonts/Poppins-Light.woff2",
			weight: "300",
			style: "normal",
		},
		{
			path: "../public/fonts/Poppins-Regular.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "../public/fonts/Poppins-Medium.woff2",
			weight: "500",
			style: "normal",
		},
		{
			path: "../public/fonts/Poppins-SemiBold.woff2",
			weight: "600",
			style: "normal",
		},
		{
			path: "../public/fonts/Poppins-Bold.woff2",
			weight: "700",
			style: "normal",
		},
	],
	variable: "--font-poppins",
	display: "swap",
});

export const headingFont = Nunito({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	style: ["normal", "italic"],
	variable: "--font-heading",
	display: "swap",
});

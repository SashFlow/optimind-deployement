// app/fonts.ts
import { Poppins } from "next/font/google";
import localFont from "next/font/local";

export const poppins = Poppins({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-poppins",
});

export const headingFont = localFont({
	src: [
		{
			path: "../public/fonts/HelveticaNeue-UltraLight.woff2",
			weight: "100",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-UltraLightItalic.woff2",
			weight: "100",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Thin.woff2",
			weight: "200",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-ThinItalic.woff2",
			weight: "200",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Light.woff2",
			weight: "300",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-LightItalic.woff2",
			weight: "300",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Roman.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-Italic.woff2",
			weight: "400",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Medium.woff2",
			weight: "500",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-MediumItalic.woff2",
			weight: "500",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Bold.woff2",
			weight: "700",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-BoldItalic.woff2",
			weight: "700",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Heavy.woff2",
			weight: "800",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-HeavyItalic.woff2",
			weight: "800",
			style: "italic",
		},
		{
			path: "../public/fonts/HelveticaNeue-Black.woff2",
			weight: "900",
			style: "normal",
		},
		{
			path: "../public/fonts/HelveticaNeue-BlackItalic.woff2",
			weight: "900",
			style: "italic",
		},
	],
	variable: "--font-heading",
});

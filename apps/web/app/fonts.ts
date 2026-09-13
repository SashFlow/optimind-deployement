// app/fonts.ts
import { Nunito } from "next/font/google";

export const nunito = Nunito({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	style: ["normal", "italic"],
	variable: "--font-heading",
	display: "swap",
});

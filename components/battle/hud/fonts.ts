import { Alegreya_Sans, Alegreya_SC, EB_Garamond } from "next/font/google";

const sc = Alegreya_SC({ subsets: ["latin", "cyrillic"], weight: ["500", "700", "800"], variable: "--font-hud-sc", display: "swap" });

const sans = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-hud-sans", display: "swap" });

const book = EB_Garamond({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-hud-book", display: "swap" });

export const hudFontClassName = `${sc.variable} ${sans.variable} ${book.variable}`;

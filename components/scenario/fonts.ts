import { Alegreya, Alegreya_Sans } from "next/font/google";

const serif = Alegreya({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-scenario-serif", display: "swap", preload: false });

const sans = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-scenario-sans", display: "swap", preload: false });

export const scenarioFontClassName = `${serif.variable} ${sans.variable}`;

import { Alegreya_Sans, Alegreya_SC, EB_Garamond } from "next/font/google";

// preload is per call, so lazy weights are separate calls; same family name, so the browser merges their faces
const sc = Alegreya_SC({ subsets: ["latin", "cyrillic"], weight: ["500", "700"], variable: "--font-hud-sc", display: "swap" });

const scLazy = Alegreya_SC({ subsets: ["latin", "cyrillic"], weight: ["800"], variable: "--font-hud-sc-lazy", display: "swap", preload: false });

const sans = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--font-hud-sans", display: "swap" });

const sansLazy = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["500", "700"], style: ["normal", "italic"], variable: "--font-hud-sans-lazy", display: "swap", preload: false });

const sansItalic = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400"], style: ["italic"], variable: "--font-hud-sans-italic", display: "swap", preload: false });

const book = EB_Garamond({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-hud-book", display: "swap", preload: false });

export const hudFontClassName = [sc, scLazy, sans, sansLazy, sansItalic, book].map((f) => f.variable).join(" ");

export const HUD_SURFACE = "hud-surface";

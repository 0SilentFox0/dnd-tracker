import type { Locale } from "@/lib/i18n/config";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dnd-tracker-omega.vercel.app").replace(/\/$/, "");

// off until the public launch: robots.txt disallows everything and pages carry noindex
export const SITE_INDEXING = process.env.SITE_INDEXING === "1";

// working name: the single place to rename the product
export const BRAND = { name: "Dice & Banner", short: "D&B", mark: "d20" } as const;

export const LANDING_PATH = { en: "/", uk: "/uk" } as const satisfies Record<Locale, string>;

export const LANDING_PATHS: string[] = Object.values(LANDING_PATH);

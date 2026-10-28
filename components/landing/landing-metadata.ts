import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { uk: "uk_UA", en: "en_US" };

const HOME_PATH: Record<Locale, string> = { uk: "/", en: "/en" };

export function landingHomePath(locale: Locale): string {
  return HOME_PATH[locale];
}

export async function buildLandingMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslator(locale, "landing");

  const title = t("meta.title");

  const description = t("meta.description");

  const image = "/landing/hero-dice.webp";

  return {
    title: { absolute: title },
    description,
    keywords: t("meta.keywords"),
    alternates: { canonical: HOME_PATH[locale], languages: { uk: "/", en: "/en", "x-default": "/" } },
    openGraph: {
      type: "website",
      url: HOME_PATH[locale],
      siteName: "D&D Combat Tracker",
      locale: OPEN_GRAPH_LOCALE[locale],
      title,
      description,
      images: [{ url: image, width: 1920, height: 1080, alt: t("meta.imageAlt") }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

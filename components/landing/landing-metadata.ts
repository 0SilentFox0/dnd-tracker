import type { Metadata } from "next";

import { keysOf } from "@/components/landing/messages";
import { BRAND, LANDING_PATH, SITE_URL } from "@/lib/constants/site";
import { type Locale, LOCALES } from "@/lib/i18n/config";
import { getTranslator, type Translator } from "@/lib/i18n/translator";

const OG_IMAGE = "/landing/screen-battle.webp";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", uk: "uk_UA" };

export async function buildLandingMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslator(locale, "landing");

  const title = t("meta.title", { brand: BRAND.name });

  const description = t("meta.description");

  return {
    title: { absolute: title },
    description,
    keywords: t("meta.keywords"),
    alternates: { canonical: LANDING_PATH[locale], languages: { ...LANDING_PATH, "x-default": LANDING_PATH.en } },
    openGraph: {
      type: "website",
      url: LANDING_PATH[locale],
      siteName: BRAND.name,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1500, height: 763, alt: t("hero.alt") }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export function buildLandingJsonLd(t: Translator, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: BRAND.name,
        url: SITE_URL + (LANDING_PATH[locale] === "/" ? "" : LANDING_PATH[locale]),
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: t("meta.description"),
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: keysOf(t, "faq.items").map((key) => ({
          "@type": "Question",
          name: t(`faq.items.${key}.q`),
          acceptedAnswer: { "@type": "Answer", text: t(`faq.items.${key}.a`) },
        })),
      },
    ],
  };
}

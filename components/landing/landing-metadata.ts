import type { Metadata } from "next";

import type { LandingCopy, Locale } from "@/components/landing/copy/types";
import { BRAND, LANDING_PATH, SITE_URL } from "@/lib/constants/site";

const OG_IMAGE = "/landing/screen-battle.webp";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", uk: "uk_UA" };

export function buildLandingMetadata(copy: LandingCopy): Metadata {
  const { locale } = copy;

  const { title, description, keywords } = copy.meta;

  const other = locale === "uk" ? "en" : "uk";

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: LANDING_PATH[locale], languages: { ...LANDING_PATH, "x-default": LANDING_PATH.en } },
    openGraph: {
      type: "website",
      url: LANDING_PATH[locale],
      siteName: BRAND.name,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[other]],
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1500, height: 763, alt: copy.hero.alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export function buildLandingJsonLd(copy: LandingCopy) {
  const { locale } = copy;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: BRAND.name,
        url: SITE_URL + (locale === "uk" ? LANDING_PATH.uk : ""),
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: copy.meta.description,
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: copy.faq.items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };
}

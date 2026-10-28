import type { Metadata } from "next";

import type { LandingCopy, Locale } from "@/components/landing/copy/types";
import { BRAND, SITE_URL } from "@/lib/constants/site";

const OG_IMAGE = "/landing/screen-battle.webp";

const OG_LOCALE: Record<Locale, string> = { en: "en_US", uk: "uk_UA" };

function pathOf(locale: Locale) {
  return locale === "uk" ? "/uk" : "/";
}

export function buildLandingMetadata(copy: LandingCopy): Metadata {
  const { locale } = copy;

  const { title, description, keywords, ogAlt } = copy.meta;

  const other = locale === "uk" ? "en" : "uk";

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: pathOf(locale), languages: { en: "/", uk: "/uk", "x-default": "/" } },
    openGraph: {
      type: "website",
      url: pathOf(locale),
      siteName: BRAND.name,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[other]],
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1920, height: 1080, alt: ogAlt }],
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
        url: locale === "uk" ? `${SITE_URL}/uk` : SITE_URL,
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

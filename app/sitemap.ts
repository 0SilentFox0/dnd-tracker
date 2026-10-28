import type { MetadataRoute } from "next";

import { LANDING_PATH, SITE_URL } from "@/lib/constants/site";
import { LOCALES } from "@/lib/i18n/config";

const landingUrl = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);

const LANDING_LANGUAGES = {
  ...Object.fromEntries(LOCALES.map((l) => [l, landingUrl(LANDING_PATH[l])])),
  "x-default": SITE_URL,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...LOCALES.map((l) => ({
      url: landingUrl(LANDING_PATH[l]),
      changeFrequency: "weekly" as const,
      priority: 1,
      alternates: { languages: LANDING_LANGUAGES },
    })),
    { url: `${SITE_URL}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/sign-in`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

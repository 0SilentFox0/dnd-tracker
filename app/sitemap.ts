import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1, alternates: { languages: { en: SITE_URL, uk: `${SITE_URL}/uk` } } },
    { url: `${SITE_URL}/uk`, changeFrequency: "weekly", priority: 1, alternates: { languages: { en: SITE_URL, uk: `${SITE_URL}/uk` } } },
    { url: `${SITE_URL}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/sign-in`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

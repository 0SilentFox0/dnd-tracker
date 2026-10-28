import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/en`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/sign-in`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

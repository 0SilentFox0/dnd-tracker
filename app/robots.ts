import type { MetadataRoute } from "next";

import { SITE_INDEXING, SITE_URL } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXING) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/campaigns/", "/settings/", "/dev/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

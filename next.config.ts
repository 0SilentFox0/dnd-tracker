import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // CSS goes into the HTML instead of render-blocking requests (mobile LCP on the landing)
  experimental: { inlineCss: true },
  async headers() {
    return [{ source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  async redirects() {
    return [
      {
        source: "/campaigns/:id/dm/artifacts/sets/new",
        destination: "/campaigns/:id/dm/artifact-sets/new",
        permanent: false,
      },
      {
        source: "/campaigns/:id/dm/artifacts/sets/:setId",
        destination: "/campaigns/:id/dm/artifact-sets/:setId",
        permanent: false,
      },
      {
        source: "/campaigns/:id/dm/artifacts/sets",
        destination: "/campaigns/:id/dm/artifact-sets",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

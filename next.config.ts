import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;

import { getCopy } from "@/components/landing/copy";
import { buildLandingJsonLd, buildLandingMetadata } from "@/components/landing/landing-metadata";
import { LandingPage } from "@/components/landing/LandingPage";

const copy = getCopy("en");

export const metadata = buildLandingMetadata(copy);

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingJsonLd(copy)).replace(/</g, "\\u003c") }} />
      <LandingPage copy={copy} />
    </>
  );
}

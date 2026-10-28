import { describe, expect, it } from "vitest";

import { getCopy } from "@/components/landing/copy";
import { buildLandingJsonLd, buildLandingMetadata } from "@/components/landing/landing-metadata";
import { BRAND } from "@/lib/constants/site";

describe.each(["en", "uk"] as const)("landing metadata (%s)", (locale) => {
  const copy = getCopy(locale);

  it("JSON-LD has no offers and FAQ matches copy", () => {
    const ld = buildLandingJsonLd(copy) as { "@graph": Record<string, unknown>[] };

    expect(JSON.stringify(ld)).not.toContain("offers");

    const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };

    expect(faq.mainEntity.map((x) => x.name)).toEqual(copy.faq.items.map((i) => i.q));
  });

  it("uses brand site name, locale canonical and x-default hreflang", () => {
    const meta = buildLandingMetadata(copy);

    expect(meta.openGraph?.siteName).toBe(BRAND.name);
    expect(meta.alternates?.canonical).toBe(locale === "uk" ? "/uk" : "/");
    expect(meta.alternates?.languages).toMatchObject({ en: "/", uk: "/uk", "x-default": "/" });
  });
});

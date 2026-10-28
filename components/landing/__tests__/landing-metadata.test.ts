import { describe, expect, it, vi } from "vitest";

import { buildLandingJsonLd, buildLandingMetadata } from "@/components/landing/landing-metadata";
import { BRAND } from "@/lib/constants/site";
import { getTranslator } from "@/lib/i18n/translator";
import en from "@/messages/en/landing.json";
import uk from "@/messages/uk/landing.json";

vi.unmock("@/lib/i18n/translator");

const MESSAGES = { en, uk };

describe.each(["en", "uk"] as const)("landing metadata (%s)", (locale) => {
  it("JSON-LD has no offers and FAQ matches the messages", async () => {
    const ld = buildLandingJsonLd(await getTranslator(locale, "landing"), locale) as { "@graph": Record<string, unknown>[] };

    expect(JSON.stringify(ld)).not.toContain("offers");

    const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };

    expect(faq.mainEntity.map((x) => x.name)).toEqual(Object.values(MESSAGES[locale].faq.items).map((i) => i.q));
  });

  it("uses brand site name, locale canonical and x-default hreflang", async () => {
    const meta = await buildLandingMetadata(locale);

    expect(meta.title).toEqual({ absolute: expect.stringContaining(BRAND.name) });
    expect(meta.openGraph?.siteName).toBe(BRAND.name);
    expect(meta.alternates?.canonical).toBe(locale === "uk" ? "/uk" : "/");
    expect(meta.alternates?.languages).toEqual({ en: "/", uk: "/uk", "x-default": "/" });
  });
});

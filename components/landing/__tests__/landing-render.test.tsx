import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LandingPage } from "@/components/landing/LandingPage";
import { LANDING_PATH } from "@/lib/constants/site";
import { LOCALES } from "@/lib/i18n/config";
import en from "@/messages/en/landing.json";
import uk from "@/messages/uk/landing.json";

vi.unmock("@/lib/i18n/translator");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

vi.mock("@/lib/hooks/auth", () => ({ useHasSessionCookie: () => false }));

const MESSAGES = { en, uk };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe.each(LOCALES)("LandingPage (%s)", async (locale) => {
  const m = MESSAGES[locale];

  const html = renderToStaticMarkup(await LandingPage({ locale }));

  it("renders one h1 and the wrapper language", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`lang="${locale}"`);
  });

  it("links every language and shows the hero CTA", () => {
    for (const l of LOCALES) expect(html).toContain(`href="${LANDING_PATH[l]}" hrefLang="${l}"`);
    expect(html).toContain(escape(m.hero.primary));
    expect(html).toContain(escape(m.nav.signUp));
  });

  it("renders each section exactly once", () => {
    for (const id of ["combat", "mechanics", "prep", "ai", "players", "how", "faq"]) {
      expect(html.match(new RegExp(`id="${id}"`, "g")), id).toHaveLength(1);
    }
  });

  it("puts the FAQ into JSON-LD", () => {
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(JSON.stringify(m.faq.items["1"].q).slice(1, -1).replace(/</g, "\\u003c"));
  });

  it("hides the templates note while templates are off", () => {
    expect(html).not.toContain(escape(m.mechanics.templatesNote));
  });

  it("makes no pricing claims", () => {
    expect(html).not.toMatch(/free|безкоштов/i);
  });
});

describe("language isolation", () => {
  it("has no Cyrillic in the EN markup besides the switcher's native names", async () => {
    const html = renderToStaticMarkup(await LandingPage({ locale: "en" }));

    // eslint-disable-next-line no-restricted-syntax -- the switcher names each language in itself
    expect(html.replace("Українська", "")).not.toMatch(/[А-Яа-яІіЇїЄє]/);
  });
});

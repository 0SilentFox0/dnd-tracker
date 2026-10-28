import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getCopy } from "@/components/landing/copy";
import { LandingPage } from "@/components/landing/LandingPage";
import { LANDING_LOCALES } from "@/lib/constants/site";

const OTHER = { en: { href: "/uk", lang: "uk" }, uk: { href: "/", lang: "en" } } as const;

describe.each(LANDING_LOCALES)("LandingPage (%s)", (locale) => {
  const copy = getCopy(locale);

  const html = renderToStaticMarkup(<LandingPage copy={copy} />);

  it("renders one h1 and the wrapper language", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`lang="${locale}"`);
  });

  it("links to the other language and shows the hero CTA", () => {
    expect(html).toContain(`href="${OTHER[locale].href}"`);
    expect(html).toContain(copy.hero.primary);
    expect(html).toContain(copy.nav.signUp);
  });

  it("renders each section exactly once", () => {
    for (const id of ["combat", "mechanics", "prep", "ai", "players", "how", "faq"]) {
      expect(html.match(new RegExp(`id="${id}"`, "g")), id).toHaveLength(1);
    }
  });

  it("hides the templates note while templates are off", () => {
    expect(html).not.toContain(copy.mechanics.templatesNote);
  });

  it("makes no pricing claims", () => {
    expect(html).not.toMatch(/free|безкоштов/i);
  });
});

describe("language isolation", () => {
  it("has no Cyrillic in the EN markup", () => {
    const html = renderToStaticMarkup(<LandingPage copy={getCopy("en")} />);

    // the UA switch label is the only allowed Cyrillic
    expect(html.replace(getCopy("en").nav.switchLabel, "")).not.toMatch(/[А-Яа-яІіЇїЄє]/);
  });
});

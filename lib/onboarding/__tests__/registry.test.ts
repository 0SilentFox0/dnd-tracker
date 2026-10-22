import { describe, expect, it } from "vitest";

import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { FLAG_KEY_RE, hintKey } from "@/lib/onboarding/flag-keys";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";
import { HINTS } from "@/lib/onboarding/hints";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe("onboarding registry", () => {
  it("id унікальні", () => {
    expect(unique(DM_STEPS.map((s) => s.id))).toBe(true);
    expect(unique(PLAYER_STEPS.map((s) => s.id))).toBe(true);
    expect(unique(WHATS_NEW.map((e) => e.id))).toBe(true);
    expect(unique(HELP_ARTICLES.map((a) => a.slug))).toBe(true);
  });

  it("ключ HINTS збігається з id і дає валідний ключ прапорця", () => {
    for (const [key, hint] of Object.entries(HINTS)) {
      expect(hint.id).toBe(key);
      expect(FLAG_KEY_RE.test(hintKey(key))).toBe(true);
    }
  });

  it("кожен helpSlug існує", () => {
    const slugs = [...DM_STEPS, ...PLAYER_STEPS, ...Object.values(HINTS)].map((x) => x.helpSlug).filter((s): s is string => !!s);

    for (const slug of slugs) expect(getHelpArticle(slug), slug).toBeDefined();
  });

  it("«Що нового» відсортовано від новіших", () => {
    const dates = WHATS_NEW.map((e) => e.date);

    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("статті не порожні", () => {
    for (const a of HELP_ARTICLES) {
      expect(a.sections.length, a.slug).toBeGreaterThan(0);
      for (const s of a.sections) expect(s.blocks.length, `${a.slug}/${s.heading}`).toBeGreaterThan(0);
    }
  });
});

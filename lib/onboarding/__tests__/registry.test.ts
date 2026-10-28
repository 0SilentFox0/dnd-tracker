import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { FLAG_KEY_RE, hintKey } from "@/lib/onboarding/flag-keys";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";
import { HINTS } from "@/lib/onboarding/hints";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

function flatten(tree: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;

    return typeof v === "string" ? { ...acc, [path]: v } : { ...acc, ...flatten(v as Record<string, unknown>, path) };
  }, {});
}

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
      for (const s of a.sections) expect(s.blocks.length, `${a.slug}/${a.sections.indexOf(s)}`).toBeGreaterThan(0);
    }
  });

  describe.each(LOCALES)("переклади %s", (locale) => {
    const keys = async (ns: "onboarding" | "whatsNew") => flatten(await localSource.load(locale, ns));

    it("кожен id реєстру має ключі", async () => {
      const onboarding = await keys("onboarding");

      const whatsNew = await keys("whatsNew");

      for (const s of DM_STEPS) {
        expect(onboarding, s.id).toHaveProperty([`checklist.dm.${s.id}.title`]);
        expect(onboarding, s.id).toHaveProperty([`checklist.dm.${s.id}.description`]);
      }

      for (const s of PLAYER_STEPS) {
        expect(onboarding, s.id).toHaveProperty([`checklist.player.${s.id}.title`]);
        expect(onboarding, s.id).toHaveProperty([`checklist.player.${s.id}.description`]);
      }

      for (const id of Object.keys(HINTS)) {
        expect(onboarding, id).toHaveProperty([`hints.${id}.title`]);
        expect(onboarding, id).toHaveProperty([`hints.${id}.body`]);
      }

      for (const e of WHATS_NEW) {
        expect(whatsNew, e.id).toHaveProperty([`${e.id}.title`]);
        expect(whatsNew, e.id).toHaveProperty([`${e.id}.body`]);
      }
    });

    it("в JSON немає id, яких нема в реєстрі", async () => {
      const onboarding = Object.keys(await keys("onboarding"));

      const whatsNew = Object.keys(await keys("whatsNew")).filter((k) => !k.startsWith("ui."));

      const expectedOnboarding = new Set<string>();

      for (const s of DM_STEPS) expectedOnboarding.add(`checklist.dm.${s.id}`);
      for (const s of PLAYER_STEPS) expectedOnboarding.add(`checklist.player.${s.id}`);
      for (const id of Object.keys(HINTS)) expectedOnboarding.add(`hints.${id}`);

      const strays = onboarding.filter((k) => !k.startsWith("ui.") && ![...expectedOnboarding].some((p) => k.startsWith(`${p}.`)));

      expect(strays).toEqual([]);
      expect(whatsNew.filter((k) => !WHATS_NEW.some((e) => k.startsWith(`${e.id}.`)))).toEqual([]);
    });
  });
});

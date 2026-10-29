import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { FLAG_KEY_RE, hintKey } from "@/lib/onboarding/flag-keys";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";
import { HINTS } from "@/lib/onboarding/hints";
import type { DmFacts, PlayerFacts } from "@/lib/onboarding/types";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

function flatten(tree: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;

    return typeof v === "string" ? { ...acc, [path]: v } : { ...acc, ...flatten(v as Record<string, unknown>, path) };
  }, {});
}

const DM_ZERO: DmFacts = { races: 0, units: 0, players: 0, activePlayerCharacters: 0, pendingDrafts: 0, battles: 0, battlesStarted: 0, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

const PLAYER_ZERO: PlayerFacts = { ownCharacter: "none", sheetSeen: false, joinedBattle: false };

const DM_TRIGGER: DmFacts = { ...DM_ZERO, pendingDrafts: 2 };

const PLAYER_TRIGGER: PlayerFacts = { ...PLAYER_ZERO, ownCharacter: "pending" };

const cap = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

const variantKeys = (role: "dm" | "player", id: string, name: string | undefined) => (name ? [`checklist.${role}.${id}.description${cap(name)}`] : []);

const dmVariant = (s: (typeof DM_STEPS)[number]) => s.variant?.(DM_TRIGGER)?.name;

const playerVariant = (s: (typeof PLAYER_STEPS)[number]) => s.variant?.(PLAYER_TRIGGER)?.name;

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

      for (const s of DM_STEPS) {
        if (s.variant) expect(dmVariant(s), s.id).toBeDefined();

        for (const k of variantKeys("dm", s.id, dmVariant(s))) expect(onboarding, k).toHaveProperty([k]);
      }

      for (const s of PLAYER_STEPS) {
        if (s.variant) expect(playerVariant(s), s.id).toBeDefined();

        for (const k of variantKeys("player", s.id, playerVariant(s))) expect(onboarding, k).toHaveProperty([k]);
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

      const allowed = new Set<string>();

      for (const s of DM_STEPS) ["title", "description", ...variantKeys("dm", s.id, dmVariant(s)).map((k) => k.split(".").slice(3).join("."))].forEach((f) => allowed.add(`checklist.dm.${s.id}.${f}`));
      for (const s of PLAYER_STEPS) ["title", "description", ...variantKeys("player", s.id, playerVariant(s)).map((k) => k.split(".").slice(3).join("."))].forEach((f) => allowed.add(`checklist.player.${s.id}.${f}`));
      for (const id of Object.keys(HINTS)) ["title", "body"].forEach((f) => allowed.add(`hints.${id}.${f}`));

      const strays = onboarding.filter((k) => !k.startsWith("ui.") && !(allowed.has(k) || [...allowed].some((p) => k.startsWith(`${p}.`))));

      expect(strays).toEqual([]);
      expect(whatsNew.filter((k) => !WHATS_NEW.some((e) => k.startsWith(`${e.id}.`)))).toEqual([]);
    });
  });
});

import { describe, expect, it } from "vitest";

import { FX_SPRITES, PREP_PANELS, SHOWCASE_MEDIA } from "@/components/landing/media";
import { BRAND } from "@/lib/constants/site";
import { LOCALES } from "@/lib/i18n/config";
import en from "@/messages/en/landing.json";
import uk from "@/messages/uk/landing.json";

type Leaf = { path: string; value: string };

const MESSAGES = { en, uk };

function leaves(node: unknown, path = ""): Leaf[] {
  if (typeof node === "string") return [{ path, value: node }];

  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));

  return [];
}

const PRODUCT_TERMS = ["{brand}", "D&D", "5e", "AI", "MCP", "API", "OpenAPI", "CSV", "TSV", "JSON", "Claude", "OpenAI", "Gemini", "XP", "SRD", "RPG", "PDF", "3D", "Unsplash", "game-icons.net", "Delapouite", "Lorc", "CC BY", "Wizards of the Coast", "Dungeons & Dragons", BRAND.short];

describe("landing messages", () => {
  it.each(LOCALES)("%s: every panel has a screenshot and every sprite a name", (locale) => {
    const m = MESSAGES[locale];

    for (const id of [...PREP_PANELS, ...Object.keys(m.players.panels)] as (keyof typeof SHOWCASE_MEDIA)[]) expect(SHOWCASE_MEDIA[id]?.image, id).toBeTruthy();

    expect(Object.keys(m.prep.panels)).toEqual([...PREP_PANELS]);
    expect(Object.keys(m.combat.fx.names)).toHaveLength(FX_SPRITES.length);
  });

  it.each(LOCALES)("%s: every leaf string is non-empty", (locale) => {
    for (const { path, value } of leaves(MESSAGES[locale])) expect(value.trim(), path).not.toBe("");
  });

  it.each(LOCALES)("%s: no pricing claims", (locale) => {
    for (const { path, value } of leaves(MESSAGES[locale])) expect(value, path).not.toMatch(/free|безкоштов|trial|pricing|тариф/i);
  });

  it.each(LOCALES)("%s: the brand comes from {brand}, only in meta and footer", (locale) => {
    for (const { path, value } of leaves(MESSAGES[locale])) {
      expect(value, path).not.toContain(BRAND.name);

      if (!path.startsWith("meta.") && !path.startsWith("footer.")) expect(value, path).not.toContain("{brand}");
    }
  });

  it("EN leaves contain no Cyrillic", () => {
    for (const { path, value } of leaves(en)) expect(value, path).not.toMatch(/[Ѐ-ӿ]/);
  });

  it("UK leaves use Latin only for product terms", () => {
    const strip = new RegExp(PRODUCT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");

    for (const { path, value } of leaves(uk)) expect(value.replace(strip, ""), path).not.toMatch(/[A-Za-z]{2,}/);
  });

  it("has no unfulfilled claims", () => {
    for (const { path, value } of leaves(en)) expect(value, path).not.toMatch(/obojima|video|remembers everything|testimonial/i);
  });
});

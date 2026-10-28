import { describe, expect, it } from "vitest";

import { getCopy } from "@/components/landing/copy";
import { FX_SPRITES, SHOWCASE_MEDIA } from "@/components/landing/media";
import { BRAND, LANDING_LOCALES } from "@/lib/constants/site";

type Leaf = { path: string; value: string };

const SKIP_KEYS = new Set(["href", "id", "locale"]);

function shape(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(shape);

  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, shape(v)]));

  return typeof node;
}

function leaves(node: unknown, path = ""): Leaf[] {
  if (typeof node === "string") return [{ path, value: node }];

  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));

  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));

  return [];
}

// the language switch label is written in the target language
function textLeaves(node: unknown): Leaf[] {
  return leaves(node).filter((l) => !SKIP_KEYS.has(l.path.split(".").pop()?.replace(/\[\d+\]/g, "") ?? "") && !l.path.startsWith("nav.switch"));
}

const PRODUCT_TERMS = ["D&D", "5e", "AI", "MCP", "API", "OpenAPI", "CSV", "TSV", "JSON", "Claude", "OpenAI", "Gemini", "XP", "SRD", "RPG", "PDF", "3D", "Unsplash", "game-icons.net", "Delapouite", "Lorc", "CC BY", "Wizards of the Coast", "Dungeons & Dragons", BRAND.name, BRAND.short];

describe("landing copy", () => {
  const en = getCopy("en");

  const uk = getCopy("uk");

  it("locales match the constant", () => {
    expect(en.locale).toBe("en");
    expect(uk.locale).toBe("uk");
    expect(LANDING_LOCALES).toEqual(["en", "uk"]);
  });

  it("EN and UK have identical key trees and list lengths", () => {
    expect(shape(uk)).toEqual(shape(en));
  });

  it.each(["problem.pains", "faq.items", "how.steps", "combat.points", "mechanics.capabilities"])("%s has the same length in both languages", (path) => {
    const at = (c: unknown) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], c) as unknown[];

    expect(at(uk).length).toBe(at(en).length);
    expect(at(en).length).toBeGreaterThan(0);
  });

  it.each(LANDING_LOCALES)("%s: every screenshot panel has an image and every sprite a name", (locale) => {
    const c = getCopy(locale);

    for (const id of [...c.prep.panels, ...c.players.panels].map((p) => p.id)) expect(SHOWCASE_MEDIA[id].image, id).toBeTruthy();

    expect(c.combat.fx.names).toHaveLength(FX_SPRITES.length);
  });

  it.each(LANDING_LOCALES)("%s: every leaf string is non-empty", (locale) => {
    for (const { path, value } of leaves(getCopy(locale))) expect(value.trim(), path).not.toBe("");
  });

  it.each(LANDING_LOCALES)("%s: no pricing claims", (locale) => {
    for (const { path, value } of leaves(getCopy(locale))) expect(value, path).not.toMatch(/free|безкоштов|trial|pricing|тариф/i);
  });

  it.each(LANDING_LOCALES)("%s: brand name only in meta and footer", (locale) => {
    for (const { path, value } of leaves(getCopy(locale))) {
      if (path.startsWith("meta.") || path.startsWith("footer.")) continue;

      expect(value, path).not.toContain(BRAND.name);
    }
  });

  it("EN leaves contain no Cyrillic", () => {
    for (const { path, value } of textLeaves(en)) expect(value, path).not.toMatch(/[Ѐ-ӿ]/);
  });

  it("UK leaves use Latin only for product terms", () => {
    const strip = new RegExp(PRODUCT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");

    for (const { path, value } of textLeaves(uk)) expect(value.replace(strip, ""), path).not.toMatch(/[A-Za-z]{2,}/);
  });

  it("has no unfulfilled claims", () => {
    for (const { path, value } of leaves(en)) expect(value, path).not.toMatch(/obojima|video|remembers everything|testimonial/i);
  });
});

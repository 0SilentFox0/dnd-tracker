import { describe, expect, it } from "vitest";

import { ABILITY_TEMPLATES, RECIPE_CATEGORIES, RECIPES } from "..";

describe("recipe catalog", () => {
  it("ids are unique and order is stable", () => {
    const ids = RECIPES.map((r) => r.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["stats", "damage", "onHit", "resistance", "aura", "survive", "bonusAction", "spellSlots", "damageSpell", "healSpell", "dotSpell", "hotSpell", "condition", "pushBack", "buffArmor", "cleanse", "morale", "concentrationBuff"]);
  });

  it("categories are known and defaults respect bounds", () => {
    for (const r of RECIPES) {
      expect(RECIPE_CATEGORIES).toContain(r.category);

      for (const p of r.params) {
        if (p.min !== undefined) expect(Number(p.default), `${r.id}.${p.key}`).toBeGreaterThanOrEqual(p.min);

        if (p.max !== undefined) expect(Number(p.default), `${r.id}.${p.key}`).toBeLessThanOrEqual(p.max);

        if (p.options) expect(p.options, `${r.id}.${p.key}`).toContain(String(p.default));
      }
    }
  });

  it("ABILITY_TEMPLATES are the ability-scope recipes", () => {
    expect(ABILITY_TEMPLATES).toEqual(RECIPES.filter((r) => r.scopes.includes("ability")));
  });

  it("stats recipe leaves spell slots to their own recipe", () => {
    expect(RECIPES.find((r) => r.id === "stats")?.params[0].options).not.toContain("spellSlots");
  });
});

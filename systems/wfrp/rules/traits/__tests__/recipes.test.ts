import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TRAIT_RECIPES } from "../recipes";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

const defaults = (r: (typeof TRAIT_RECIPES)[number]) => Object.fromEntries(r.params.map((p) => [p.key, p.default]));

describe("trait recipes", () => {
  it("has 15 recipes with matching ids and text keys", () => {
    expect(TRAIT_RECIPES).toHaveLength(15);

    for (const r of TRAIT_RECIPES) {
      expect(r.category).toBe("traits");
      expect(r.textKey).toBe(`wfrpTraits.recipes.${r.id}`);
    }
  });

  it.each(TRAIT_RECIPES.map((r) => [r.id, r] as const))("%s builds a valid ability from its defaults", (_id, r) => {
    const built = r.build(defaults(r), { scope: "ability", name: "Trait", note: "" });

    expect("ability" in built).toBe(true);

    if ("ability" in built) {
      const parsed = AbilitySchema.safeParse({ id: "a1", ...built.ability });

      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("honours magical and the breath range", () => {
    const breath = TRAIT_RECIPES.find((r) => r.id === "breath");

    const built = breath?.build({ damage: 7, rangeFt: 60, magical: "yes" }, { scope: "ability", name: "B", note: "" });

    expect(built && "ability" in built && built.ability.effects[0]).toEqual({ kind: "wfrpAttack", attack: "breath", damage: 7, rangeFt: 60, magical: true });
  });

  it("builds a ranged attack with its range", () => {
    const ranged = TRAIT_RECIPES.find((r) => r.id === "ranged");

    const built = ranged?.build({ damage: 4, rangeFt: 150, magical: "no" }, { scope: "ability", name: "Sling +4", note: "" });

    expect(built && "ability" in built && built.ability).toEqual({ name: "Sling +4", trigger: { event: "passive" }, effects: [{ kind: "wfrpAttack", attack: "ranged", damage: 4, rangeFt: 150 }] });
  });

  it("accepts rangeFt on ranged and still rejects it on bite", () => {
    const parse = (effect: object) => AbilitySchema.safeParse({ id: "a1", name: "X", trigger: { event: "passive" }, effects: [effect] }).success;

    expect(parse({ kind: "wfrpAttack", attack: "ranged", damage: 4, rangeFt: 150 })).toBe(true);
    expect(parse({ kind: "wfrpAttack", attack: "bite", damage: 4, rangeFt: 30 })).toBe(false);
  });

  it("does not import the editor or template catalog at runtime", () => {
    const src = readFileSync(join(__dirname, "../recipes.ts"), "utf8");

    expect(src).not.toMatch(/^import (?!type)[^\n]*(abilities\/editor|templates\/catalog)/m);
    expect(src).not.toMatch(/from "zod"/);
  });
});

import { describe, expect, it } from "vitest";

import { ComponentFlagsSchema, readStoredIngredients,SpellIngredientSchema } from "@/lib/schemas/spell-ingredients";
import { createSpellSchema } from "@/lib/schemas/spells";
import { defaultFocus } from "@/lib/utils/spells/ingredients/types";

const diamond = { name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false };

const base = { name: "Revivify", componentFlags: { v: true, s: true, m: true } };

describe("SpellIngredientSchema", () => {
  it("accepts a valid row and applies defaults", () => {
    expect(SpellIngredientSchema.parse({ name: "Ruby", focus: false })).toEqual({ name: "Ruby", qty: 1, consumed: false, focus: false });
    expect(SpellIngredientSchema.safeParse(diamond).success).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(SpellIngredientSchema.safeParse({ ...diamond, qty: 0 }).success).toBe(false);
    expect(SpellIngredientSchema.safeParse({ ...diamond, minGp: -1 }).success).toBe(false);
    expect(SpellIngredientSchema.safeParse({ ...diamond, name: "" }).success).toBe(false);
  });
});

describe("ComponentFlagsSchema", () => {
  it("requires all three flags", () => {
    expect(ComponentFlagsSchema.safeParse({ v: true, s: false, m: true }).success).toBe(true);
    expect(ComponentFlagsSchema.safeParse({ v: true }).success).toBe(false);
  });
});

describe("defaultFocus", () => {
  it("is true only without cost and consumption", () => {
    expect(defaultFocus({})).toBe(true);
    expect(defaultFocus({ minGp: 0 })).toBe(true);
    expect(defaultFocus({ minGp: 50 })).toBe(false);
    expect(defaultFocus({ consumed: true })).toBe(false);
  });
});

describe("createSpellSchema ingredients", () => {
  it("accepts ingredients with M set", () => {
    expect(createSpellSchema.safeParse({ ...base, ingredients: [diamond] }).success).toBe(true);
  });

  it("rejects duplicate keys", () => {
    expect(createSpellSchema.safeParse({ ...base, ingredients: [diamond, { ...diamond, name: "diamond" }] }).success).toBe(false);
  });

  it("rejects more than 8 ingredients", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ ...diamond, name: `Gem ${i}` }));

    expect(createSpellSchema.safeParse({ ...base, ingredients: many }).success).toBe(false);
  });

  it("rejects ingredients when M is false or flags are missing", () => {
    expect(createSpellSchema.safeParse({ ...base, componentFlags: { v: true, s: true, m: false }, ingredients: [diamond] }).success).toBe(false);
    expect(createSpellSchema.safeParse({ name: "X", ingredients: [diamond] }).success).toBe(false);
  });

  it("accepts null flags and empty or missing ingredients", () => {
    expect(createSpellSchema.parse({ name: "X", componentFlags: null }).ingredients).toEqual([]);
    expect(createSpellSchema.safeParse({ name: "X", ingredients: [] }).success).toBe(true);
  });
});

describe("readStoredIngredients", () => {
  const ok = { name: "Diamond", qty: 1, consumed: true, focus: false };

  it("keeps valid entries, including duplicate keys, so the check stays on", () => {
    expect(readStoredIngredients([ok, ok])).toHaveLength(2);
  });

  it("drops only the invalid entries and tolerates non-arrays", () => {
    expect(readStoredIngredients([ok, { name: "" }, 5])).toEqual([ok]);
    expect(readStoredIngredients(null)).toEqual([]);
  });
});

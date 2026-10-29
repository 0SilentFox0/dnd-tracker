import { describe, expect, it } from "vitest";

import { SpellDefinitionSchema, SpellDiceSchema } from "@/lib/utils/spells/model/schema";

const base = { dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [], raceModifiers: [] };

describe("SpellDefinitionSchema 5e", () => {
  it("приймає поля кубика та ступеня", () => {
    const r = SpellDefinitionSchema.safeParse({ ...base, dieSides: 8, upcastDice: 1, upcastTargets: 1, addAbilityMod: true });

    expect(r.success).toBe(true);
  });

  it("відхиляє dieSides 7", () => {
    expect(SpellDefinitionSchema.safeParse({ ...base, dieSides: 7 }).success).toBe(false);
  });

  it("dice: 40 ок, 41 ні", () => {
    expect(SpellDiceSchema.safeParse(40).success).toBe(true);
    expect(SpellDiceSchema.safeParse(41).success).toBe(false);
  });

  it("атака заклинанням: ворог і область ок, self ні", () => {
    expect(SpellDefinitionSchema.safeParse({ ...base, resolution: { kind: "attack" } }).success).toBe(true);
    expect(SpellDefinitionSchema.safeParse({ ...base, targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "attack" } }).success).toBe(true);

    const r = SpellDefinitionSchema.safeParse({ ...base, targeting: { kind: "self" }, resolution: { kind: "attack" } });

    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("spellEditor.validation.attackTargets");
  });
});

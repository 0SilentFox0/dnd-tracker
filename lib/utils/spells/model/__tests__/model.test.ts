import { afterEach, describe, expect, it, vi } from "vitest";

import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import { RaceModifierSchema, SpellDefinitionSchema, SpellTargetingSchema } from "@/lib/utils/spells/model/schema";

const base = { dice: 3, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [], raceModifiers: [] };

describe("SpellDefinitionSchema", () => {
  it("Вогняна куля: area + save half", () => {
    const r = SpellDefinitionSchema.safeParse({
      ...base,
      targeting: { kind: "area", side: "enemy", maxTargets: 4 },
      resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
    });

    expect(r.success).toBe(true);
  });

  it("Воскресіння: allyDead", () => {
    expect(SpellDefinitionSchema.safeParse({ ...base, dice: 0, targeting: { kind: "allyDead" } }).success).toBe(true);
  });

  it("Відродження лісу: allAlliesDead", () => {
    expect(SpellDefinitionSchema.safeParse({ ...base, dice: 0, targeting: { kind: "allAlliesDead" } }).success).toBe(true);
  });

  it("Армагеддон: everyone", () => {
    expect(SpellDefinitionSchema.safeParse({ ...base, dice: 4, targeting: { kind: "everyone" } }).success).toBe(true);
  });

  it("Слово світла: raceModifiers", () => {
    const r = SpellDefinitionSchema.safeParse({
      ...base,
      targeting: { kind: "allEnemies" },
      raceModifiers: [{ raceId: "race-human", percent: -100 }],
    });

    expect(r.success).toBe(true);
  });

  it("Поспіх: бонусна дія з ефектом", () => {
    const r = SpellDefinitionSchema.safeParse({
      ...base,
      cost: "bonusAction",
      targeting: { kind: "ally" },
      effects: [{ kind: "note", text: "x" }],
    });

    expect(r.success).toBe(true);
  });

  it("відхиляє area без side", () => {
    expect(SpellTargetingSchema.safeParse({ kind: "area", maxTargets: 3 }).success).toBe(false);
  });

  it("відхиляє невідомий вид цілі, cost і save без ability", () => {
    expect(SpellTargetingSchema.safeParse({ kind: "nobody" }).success).toBe(false);
    expect(SpellDefinitionSchema.safeParse({ ...base, cost: "reaction" }).success).toBe(false);
    expect(SpellDefinitionSchema.safeParse({ ...base, resolution: { kind: "save", onSuccess: "half" } }).success).toBe(false);
  });

  it("percent у межах −100..200", () => {
    expect(RaceModifierSchema.safeParse({ raceId: "r", percent: -101 }).success).toBe(false);
    expect(RaceModifierSchema.safeParse({ raceId: "r", percent: 201 }).success).toBe(false);
    expect(RaceModifierSchema.safeParse({ raceId: "r", percent: 200 }).success).toBe(true);
  });
});

describe("readSpellDefinition", () => {
  afterEach(() => vi.restoreAllMocks());

  it("порожній рядок -> значення за замовчуванням", () => {
    expect(readSpellDefinition({ id: "s" })).toEqual({
      dice: 0,
      cost: "action",
      targeting: { kind: "enemy" },
      resolution: { kind: "auto" },
      effects: [],
      raceModifiers: [],
    });
  });

  it("повертає збережені значення", () => {
    const def = readSpellDefinition({
      id: "s",
      dice: 3,
      cost: "bonusAction",
      targeting: { kind: "area", side: "enemy", maxTargets: 4 },
      resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
      spellEffects: [{ kind: "note", text: "x" }],
      raceModifiers: [{ raceId: "r", percent: -100 }],
    });

    expect(def.dice).toBe(3);
    expect(def.cost).toBe("bonusAction");
    expect(def.targeting).toEqual({ kind: "area", side: "enemy", maxTargets: 4 });
    expect(def.effects).toHaveLength(1);
    expect(def.raceModifiers).toEqual([{ raceId: "r", percent: -100 }]);
  });

  it("невалідні дані: значення за замовчуванням і відкидання битих елементів", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const def = readSpellDefinition({
      id: "s",
      cost: "x",
      targeting: { kind: "area" },
      resolution: 5,
      spellEffects: [{ kind: "note", text: "ok" }, { kind: "teleport" }],
      raceModifiers: "oops",
    });

    expect(def.cost).toBe("action");
    expect(def.targeting).toEqual({ kind: "enemy" });
    expect(def.resolution).toEqual({ kind: "auto" });
    expect(def.effects).toHaveLength(1);
    expect(def.raceModifiers).toEqual([]);
  });

  it("явні null у колонках -> значення за замовчуванням без попереджень", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const def = readSpellDefinition({ id: "s", dice: null, cost: null, targeting: null, resolution: null, spellEffects: null, raceModifiers: null });

    expect(def).toEqual({ dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [], raceModifiers: [] });
    expect(warn).not.toHaveBeenCalled();
  });

  it("невалідні dice і cost -> за замовчуванням з попередженням", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const def = readSpellDefinition({ id: "s", dice: 25, cost: "reaction" });

    expect(def.dice).toBe(0);
    expect(def.cost).toBe("action");
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

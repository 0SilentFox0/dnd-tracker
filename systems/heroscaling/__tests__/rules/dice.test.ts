import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { heroDicePart, heroDiceTable } from "@/systems/heroscaling/rules/dice";

const tables = { meleeDiceByLevel: { "1": "1d6" }, rangedDiceByLevel: null };

const withTables = (system: Ruleset["system"]): Ruleset => ({ ...DEFAULT_RULES, system, heroScaling: { ...DEFAULT_RULES.heroScaling, ...tables } });

const hero = { abilities: {} } as never;

const run = (rules: Ruleset) => {
  const parts = ruleSystemOf(rules).participant?.fromCharacter ?? [];

  return parts.reduce((p, part) => part(p, { row: { level: 1 }, rules, refs: {} }), hero) as { abilities: { heroDice?: unknown } };
};

describe("heroDiceTable", () => {
  it("undefined when not overridden; numeric keys when overridden", () => {
    expect(heroDiceTable(DEFAULT_RULES, "melee")).toBeUndefined();
    expect(heroDiceTable({ ...DEFAULT_RULES, heroScaling: { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { "1": "1d6" } } }, "melee")).toEqual({ 1: "1d6" });
  });

  it("часткова таблиця добирає відсутні рівні зі стандартної прогресії", () => {
    const opts = { meleeDiceByLevel: heroDiceTable({ ...DEFAULT_RULES, heroScaling: { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { "1": "1d4" } } }, "melee") };

    expect(getHeroDamageDiceForLevel(1, AttackType.MELEE, opts)).toBe("1d4");
    expect(getHeroDamageDiceForLevel(5, AttackType.MELEE, opts)).toBe(getHeroDamageDiceForLevel(5, AttackType.MELEE));
  });
});

describe("heroscaling module on d20", () => {
  it("bare dnd5e ignores the tables", () => {
    expect(run(withTables({ key: "dnd5e" })).abilities.heroDice).toBeUndefined();
  });

  it("with the module the tables become heroDice", () => {
    expect(run(withTables({ key: "dnd5e", modules: ["heroscaling"] })).abilities.heroDice).toEqual({ melee: { 1: "1d6" }, ranged: undefined });
  });

  it("homm with null tables sets nothing", () => {
    expect(heroDicePart(hero, { row: { level: 1 }, rules: DEFAULT_RULES, refs: {} })).toBe(hero);
  });
});

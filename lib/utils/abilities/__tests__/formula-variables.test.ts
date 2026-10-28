import { describe, expect, it } from "vitest";

import { FORMULA_VARIABLES, resolveAmount, resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleParticipant } from "@/types/battle";

function owner(over: { level?: number; prof?: number; cha?: number; con?: number; hp?: number } = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    abilities: { ...p.abilities, level: over.level ?? 5, proficiencyBonus: over.prof ?? 3, modifiers: { ...p.abilities.modifiers, charisma: over.cha ?? 3, constitution: over.con ?? 2 } },
    combatStats: { ...p.combatStats, currentHp: over.hp ?? 20 },
  };
}

describe("formula variables", () => {
  it("ability modifiers, proficiency and class_level (fallback: hero level)", () => {
    expect(resolveFlat({ formula: "cha_mod" }, owner())).toBe(3);
    expect(resolveFlat({ formula: "max(1, cha_mod)" }, owner({ cha: -1 }))).toBe(1);
    expect(resolveFlat({ formula: "max(0, con_mod)" }, owner({ con: -2 }))).toBe(0);
    expect(resolveFlat({ formula: "str_mod + dex_mod" }, owner())).toBe(3);
    expect(resolveFlat({ formula: "prof * 2" }, owner())).toBe(6);
    expect(resolveFlat({ formula: "2 * class_level" }, owner({ level: 7 }))).toBe(14);
    expect(resolveFlat({ formula: "5 + con_mod" }, owner({ con: -1 }))).toBe(4);
    expect(resolveAmount({ formula: "wis_mod + 1" }, { owner: owner(), rng: () => 0.5 })).toBe(1);
  });

  it("HOMM variables unchanged; prof does not touch other words", () => {
    expect(resolveFlat({ formula: "3 * floor(lost_hp_percent / 10)" }, owner({ hp: 10 }))).toBe(15);
    expect(resolveFlat({ formula: "hero_level" }, owner({ level: 9 }))).toBe(9);
    expect(resolveFlat({ formula: "proficiency + 1" }, owner())).toBe(0);
  });

  it("FORMULA_VARIABLES lists the context keys", () => {
    expect([...FORMULA_VARIABLES].sort()).toEqual(["cells_moved", "cha_mod", "class_level", "con_mod", "dex_mod", "hero_level", "int_mod", "lost_hp_percent", "morale", "prof", "str_mod", "wis_mod"]);
  });
});

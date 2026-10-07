import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "./fixtures";

import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { BattleParticipant } from "@/types/battle";

const hero = (morale: number): BattleParticipant => {
  const p = makeParticipant({
    id: "h",
    abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "physical" }, percent: { formula: "3*morale" } }] })],
  });

  return { ...p, combatStats: { ...p.combatStats, morale } };
};

describe("formula in percent", () => {
  it.each([
    [2, 6],
    [-1, -3],
  ])("morale %i → %i%%", (morale, expected) => {
    expect(collectModifiers([hero(morale)], "h", { damage: { kind: "melee" } }).percent).toBe(expected);
  });

  it("describes the formula", () => {
    expect(describeEffect({ kind: "damageBonus", filter: { kind: "all" }, percent: { formula: "3*morale" } })).toContain("(3*morale)%");
  });

  it("morale у формулі враховує власний тимчасовий бонус і прапорець noNegativeMorale", () => {
    const timed = (p: BattleParticipant, flat: number): BattleParticipant => ({
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "n", name: "Натхнення", type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat", stat: "morale", flat }] }],
      },
    });

    const query = (p: BattleParticipant) => collectModifiers([p], "h", { damage: { kind: "melee" } }).percent;

    expect(query(timed(hero(2), 1))).toBe(9);
    expect(query(timed(hero(3), 1))).toBe(9);
    expect(query(timed(hero(-2), 1))).toBe(-3);

    const base = hero(-2);

    const steady = {
      ...base,
      battleData: { ...base.battleData, resolvedAbilities: [...(base.battleData.resolvedAbilities ?? []), resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "noNegativeMorale" }] }, { id: "s" })] },
    };

    expect(query(steady)).toBe(0);
  });
});

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
});

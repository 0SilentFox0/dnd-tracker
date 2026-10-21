import { describe, expect, it } from "vitest";

import { attackMaxTargets, isCleave } from "../max-targets";

import { AttackType } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

const bite: BattleAttack = { id: "m", name: "Три голови", type: AttackType.MELEE, attackBonus: 5, damageDice: "2d6", damageType: "piercing", maxTargets: 3 };

const withStats = (maxTargets: number) => {
  const p = placed("a");

  return { ...p, combatStats: { ...p.combatStats, maxTargets } };
};

const ctx = { chain: false, onMap: true };

describe("attackMaxTargets", () => {
  it("дальня: attack.maxTargets, інакше combatStats.maxTargets", () => {
    expect(attackMaxTargets(withStats(2), bow, ctx)).toBe(2);
    expect(attackMaxTargets(withStats(2), { ...bow, maxTargets: 3 }, ctx)).toBe(3);
    expect(attackMaxTargets(placed("a"), bow, ctx)).toBe(1);
  });

  it("ланцюг — лише перша ціль", () => {
    expect(attackMaxTargets(withStats(3), bow, { ...ctx, chain: true })).toBe(1);
  });

  it("ближня: combatStats.maxTargets не діє (скіл стрільби)", () => {
    expect(attackMaxTargets(withStats(2), { ...bite, maxTargets: undefined }, ctx)).toBe(1);
  });

  it("розщеплення: на карті 1, без карти — до N вручну", () => {
    expect(isCleave(bite)).toBe(true);
    expect(attackMaxTargets(placed("a"), bite, ctx)).toBe(1);
    expect(attackMaxTargets(placed("a"), bite, { ...ctx, onMap: false })).toBe(3);
  });

  it("aoe: attack.maxTargets || combatStats.maxTargets", () => {
    expect(attackMaxTargets(withStats(4), { ...bite, targetType: "aoe", maxTargets: undefined }, ctx)).toBe(4);
    expect(isCleave({ ...bite, targetType: "aoe" })).toBe(false);
  });
});

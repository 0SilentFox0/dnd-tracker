import { describe, expect, it } from "vitest";

import { wfrpHitModel } from "../hit-model";
import { winChance } from "../win-chance";

import { buildPartyPower, computeFairScaling, type UnitStats } from "@/lib/utils/battle/balance";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems/wfrp/characteristics/keys";
import type { BattleParticipant } from "@/types/battle";

describe("winChance", () => {
  it("is monotonic in attacker target and anti-monotonic in defender target", () => {
    for (let d = 10; d <= 90; d += 20) for (let a = 5; a < 100; a += 5) expect(winChance(a + 5, d)).toBeGreaterThanOrEqual(winChance(a, d));

    for (let a = 10; a <= 90; a += 20) for (let d = 5; d < 100; d += 5) expect(winChance(a, d + 5)).toBeLessThanOrEqual(winChance(a, d));
  });

  it("is roughly symmetric for equal targets and favours the attacker on ties", () => {
    expect(winChance(40, 40)).toBeGreaterThan(0.3);
    expect(winChance(40, 40)).toBeLessThan(0.7);
    expect(winChance(60, 30) + winChance(30, 60)).toBeLessThan(1.2);
  });

  it("keeps the 01-05 / 96-00 automatic outcomes at the bounds", () => {
    expect(winChance(0, 0)).toBeGreaterThanOrEqual(0.05 * 0.96);
    expect(winChance(0, 100)).toBeGreaterThan(0);
    expect(winChance(0, 100)).toBeLessThan(0.06);
    expect(winChance(100, 0)).toBeLessThanOrEqual(0.95);
    expect(winChance(100, 0)).toBeGreaterThan(0.9);

    for (const [a, d] of [[0, 0], [100, 100], [1, 99], [NaN, 50], [500, -5]]) {
      const p = winChance(a, d);

      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

const wfrpP = (characteristics: unknown, dice = "1d6"): BattleParticipant =>
  ({
    combatStats: { maxHp: 12, currentHp: 12 },
    abilities: { level: 1, modifiers: {}, characteristics, wfrp: { sb: 3, tb: 3, ap: {}, moveYd: 4 } },
    battleData: { attacks: [{ name: "x", type: "melee", damageDice: dice }] },
  }) as unknown as BattleParticipant;

describe("wfrpHitModel", () => {
  it("falls back to defaults on empty characteristics without NaN", () => {
    const p = wfrpP(undefined);

    for (const n of [wfrpHitModel.offense(p), wfrpHitModel.defense(p), wfrpHitModel.damage(p)]) expect(Number.isFinite(n)).toBe(true);
  });

  it("damage is SB + weapon - reference TB, at least 1", () => {
    expect(wfrpHitModel.damage(wfrpP(DEFAULT_CHARACTERISTICS, "1d6"))).toBeCloseTo(3 + 3.5 - 3);
    expect(wfrpHitModel.damage(wfrpP(DEFAULT_CHARACTERISTICS, "0"))).toBeGreaterThanOrEqual(1);
  });
});

describe("computeFairScaling for wfrp", () => {
  const unit = (unitId: string, hp: number, dpr: number): UnitStats => ({ unitId, name: unitId, level: 1, hp, dpr, kpi: dpr / hp, raceId: null, ac: 35, attackBonus: 40 });

  it("returns finite scales", () => {
    const party = buildPartyPower([{ stats: { dpr: 6, hp: 12, toHit: 40, ac: 40, weaponDpr: 6 }, hero: true }, { stats: { dpr: 6, hp: 12, toHit: 40, ac: 40, weaponDpr: 6 }, hero: true }], wfrpHitModel);

    const s = computeFairScaling(party, [{ unitId: "rat", quantity: 2 }], [unit("rat", 6, 3)]);

    expect(s.verdict).not.toBe("empty");
    expect(Number.isFinite(s.hpScale)).toBe(true);
    expect(Number.isFinite(s.dmgScale)).toBe(true);
    expect(Number.isFinite(s.units.rat.hpMult)).toBe(true);
    expect(Number.isFinite(s.units.rat.dmgMult)).toBe(true);
  });
});

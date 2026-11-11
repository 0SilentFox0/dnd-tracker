import { describe, expect, it } from "vitest";

import { wfrpHitModel } from "../hit-model";
import { winChance } from "../win-chance";

import { buildPartyPower, computeFairScaling, hitModelHeroStats, hitModelUnitStats, type UnitStats } from "@/lib/utils/battle/balance";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
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
    abilities: { level: 1, modifiers: {}, system: { key: "wfrp", data: { characteristics: characteristics ?? {}, stats: { sb: 3, tb: 3, ap: {} } } } },
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

const withWfrp = (wfrp: Record<string, unknown>, attacks?: unknown[]): BattleParticipant => {
  const p = wfrpP(DEFAULT_CHARACTERISTICS);

  const data = (p.abilities.system as { data: { characteristics: unknown } }).data;

  return { ...p, abilities: { ...p.abilities, system: { key: "wfrp", data: { ...data, stats: { sb: 3, tb: 3, ap: {}, ...wfrp } } } }, battleData: attacks ? { attacks } : p.battleData } as unknown as BattleParticipant;
};

const allAp = (n: number) => ({ head: n, arm: n, body: n, leg: n });

describe("wfrpHitModel traits", () => {
  const durability = (wfrp: Record<string, unknown>) => wfrpHitModel.durability?.(withWfrp(wfrp)) ?? 0;

  it("is 1 without armour, ward or extra toughness", () => {
    expect(durability({})).toBe(1);
  });

  it("AP 2 everywhere gives 8/6", () => {
    expect(durability({ ap: allAp(2) })).toBeCloseTo(8 / 6);
  });

  it("Ward 9 multiplies by 1.25", () => {
    expect(durability({ ward: 9 })).toBeCloseTo(1.25);
  });

  it("Ward 1 hits the clamp", () => {
    expect(durability({ ward: 1 })).toBe(10);
  });

  it("huge TB stays finite", () => {
    const d = durability({ tb: 40, ap: allAp(10) });

    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeLessThanOrEqual(10);
  });

  it("large size lowers defense by 10", () => {
    expect(wfrpHitModel.defense(withWfrp({ size: "large" }))).toBe(wfrpHitModel.defense(withWfrp({})) - 10);
  });

  it("breath without SB ignores SB, size scales damage", () => {
    const breath = [{ name: "b", type: "ranged", damageDice: "", damageBonus: 6, system: { key: "wfrp", data: { qualities: [], flaws: [], noSb: true } } }];

    expect(wfrpHitModel.damage(withWfrp({ sb: 5 }, breath))).toBeCloseTo(6 - 3);
    expect(wfrpHitModel.damage(withWfrp({ sb: 5, size: "large" }, breath))).toBeCloseTo(12 - 3);
  });

  it("unit stats multiply hp and recompute kpi; models without durability keep hp", () => {
    const unit: UnitStats = { unitId: "t", name: "t", level: 1, hp: 12, dpr: 3, kpi: 0.25, raceId: null, ac: 0, attackBonus: 0 };

    const p = withWfrp({ ward: 9 });

    const out = hitModelUnitStats(unit, p, wfrpHitModel);

    expect(out.hp).toBe(15);
    expect(out.kpi).toBeCloseTo(out.dpr / 15);
    expect(hitModelUnitStats(unit, p, { ...wfrpHitModel, durability: undefined }).hp).toBe(12);
    expect(hitModelHeroStats(p, wfrpHitModel).hp).toBe(15);
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

import { describe, expect, it } from "vitest";

import { UNITS } from "../units";

import { diceAverage } from "@/lib/utils/common/dice";

const BUDGET: Record<number, { hp: number; damage: number }> = {
  1: { hp: 12, damage: 4.5 },
  2: { hp: 22, damage: 7 },
  3: { hp: 36, damage: 10 },
  4: { hp: 58, damage: 14 },
  5: { hp: 90, damage: 20 },
  6: { hp: 140, damage: 28 },
  7: { hp: 220, damage: 40 },
};

const TOLERANCE = 0.25;

const BUDGET_EXCEPTIONS: Record<string, string> = {
  "humans-brute": "1d8+2 (6.5) на 3 % вище порога T1-alt: вузький допуск на малих числах, сила в Броньобійності",
};

function averageHit(unit: (typeof UNITS)[number]): number {
  const extra = unit.abilities
    .filter((a) => a.id.startsWith("unit-extra-damage"))
    .flatMap((a) => a.effects)
    .reduce((sum, e) => sum + (e.kind === "dealDamage" && typeof e.amount === "string" ? diceAverage(e.amount) : 0), 0);

  return diceAverage(unit.attacks[0].dice) + extra;
}

describe("unit budget", () => {
  for (const unit of UNITS.filter((u) => !u.levelScaling && !(u.key in BUDGET_EXCEPTIONS))) {
    it(`${unit.key} is within budget`, () => {
      const budget = BUDGET[unit.tier];

      const roleFactor = (unit.role === "base" ? 1 : 1.12) * (unit.attacks[0].type === "ranged" || unit.spellKeys?.length ? 0.85 : 1);

      expect(unit.hp, "hp").toBeGreaterThanOrEqual(budget.hp * roleFactor * (1 - TOLERANCE));
      expect(unit.hp, "hp").toBeLessThanOrEqual(budget.hp * roleFactor * (1 + TOLERANCE));
      expect(averageHit(unit), "damage").toBeGreaterThanOrEqual(budget.damage * roleFactor * (1 - TOLERANCE));
      expect(averageHit(unit), "damage").toBeLessThanOrEqual(budget.damage * roleFactor * (1 + TOLERANCE));
    });
  }

  it("exceptions refer to existing units and give a reason", () => {
    for (const [key, reason] of Object.entries(BUDGET_EXCEPTIONS)) {
      expect(UNITS.some((u) => u.key === key), key).toBe(true);
      expect(reason.length, key).toBeGreaterThan(0);
    }
  });
});

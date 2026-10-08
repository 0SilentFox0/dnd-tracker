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
  "dark-elves-assassin": "1d6+2 (5.5) трохи вище порога T1-upgrade ranged: малі числа; сила в отруті (DoT не рахується)",
  "dark-elves-stalker": "1d8+2 (6.5) трохи вище порога T1-alt: малі числа, ще й Отрута та Засідка",
  "mages-senior-gremlin": "1d6+2 (5.5) трохи вище порога T1-upgrade ranged: малі числа; сила в Ремонті",
  "mages-gremlin-saboteur": "1d6+2 (5.5) трохи вище порога T1-alt ranged: малі числа; сила в Саботажі",
  "humans-brute": "1d8+2 (6.5) на 3 % вище порога T1-alt: вузький допуск на малих числах, сила в Броньобійності",
  "necromancers-skeleton-archer": "1d6+2 (5.5) трохи вище порога T1-upgrade ranged: малі числа таблиці 4.7; ціна — 12 HP і КД 12",
  "demons-fire-demon": "1d6+3 + 1d6 вогнем (10) на 2 % вище порога T2-upgrade: числа таблиці 4.4; сила в імунітеті до вогню",
  "demons-elder-demon": "1d8+3 + 1d4 вогнем (10) на 2 % вище порога T2-alt: числа таблиці 4.4; ціна — Лють",
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

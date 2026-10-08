import { describe, expect, it } from "vitest";

import { UNITS } from "../units";

import { diceAverage } from "@/lib/utils/common/dice";

const BUDGET: Record<number, { hp: number; damage: number }> = {
  1: { hp: 28, damage: 3.6 },
  2: { hp: 41, damage: 6 },
  3: { hp: 55, damage: 8.8 },
  4: { hp: 76, damage: 12.6 },
  5: { hp: 107, damage: 18.6 },
  6: { hp: 154, damage: 27.2 },
  7: { hp: 220, damage: 40 },
};

const TOLERANCE = 0.25;

const BUDGET_EXCEPTIONS: Record<string, string> = {
  "dark-elves-assassin": "1d6+1 (4.5) вище порога T1-upgrade ranged: найменший крок кубика на малих числах; сила в отруті (DoT не рахується)",
  "dark-elves-stalker": "1d8+1 (5.5) вище порога T1-alt: найменший крок кубика на малих числах, ще й Отрута та Засідка",
  "mages-senior-gremlin": "1d6+1 (4.5) вище порога T1-upgrade ranged: найменший крок кубика на малих числах; сила в Ремонті",
  "mages-gremlin-saboteur": "1d6+1 (4.5) вище порога T1-alt ranged: найменший крок кубика на малих числах; сила в Саботажі",
  "humans-brute": "1d8+1 (5.5) вище порога T1-alt: найменший крок кубика на малих числах, сила в Броньобійності",
  "necromancers-skeleton-archer": "1d6+1 (4.5) вище порога T1-upgrade ranged: найменший крок кубика на малих числах; ціна — найменше HP серед T1-покращень",
  "demons-fire-demon": "1d6+2 + 1d6 вогнем (9) вище порога T2-upgrade: друга група кубиків таблиці 4.4; сила в імунітеті до вогню",
  "demons-elder-demon": "1d8+2 + 1d4 вогнем (9) вище порога T2-alt: друга група кубиків таблиці 4.4; ціна — Лють",
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

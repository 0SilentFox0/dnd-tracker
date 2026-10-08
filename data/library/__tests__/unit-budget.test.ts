import { describe, expect, it } from "vitest";

import { abilityScores } from "../unit-stats";
import { UNITS } from "../units";

import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { diceAverage } from "@/lib/utils/common/dice";

const BUDGET: Record<number, { hp: number; damage: number }> = {
  1: { hp: 28, damage: 6.8 },
  2: { hp: 41, damage: 9.3 },
  3: { hp: 55, damage: 11.7 },
  4: { hp: 76, damage: 17 },
  5: { hp: 107, damage: 21.8 },
  6: { hp: 154, damage: 29 },
  7: { hp: 220, damage: 41.4 },
};

const TOLERANCE = 0.25;

const BUDGET_EXCEPTIONS: Record<string, string> = {
  "dark-elves-assassin": "1d6+1 +4 СПР (8.5) вище порога T1-upgrade ranged (8.1): найменший крок кубика на малих числах; сила в отруті (DoT не рахується)",
  "mages-senior-gremlin": "1d6+1 +4 СПР (8.5) вище порога T1-upgrade ranged (8.1): найменший крок кубика на малих числах; сила в Ремонті",
  "mages-gremlin-saboteur": "1d6+1 +4 СПР (8.5) вище порога T1-alt ranged (8.1): найменший крок кубика на малих числах; сила в Саботажі",
  "necromancers-skeleton-archer": "1d6+1 +4 СПР (8.5) вище порога T1-upgrade ranged (8.1): найменший крок кубика на малих числах; ціна — найменше HP серед T1-покращень",
};

/** Real hit as in battle: dice + extra dice + the STR/DEX modifier the seed derives from the attack bonus. */
function averageHit(unit: (typeof UNITS)[number]): number {
  const extra = unit.abilities
    .filter((a) => a.id.startsWith("unit-extra-damage"))
    .flatMap((a) => a.effects)
    .reduce((sum, e) => sum + (e.kind === "dealDamage" && typeof e.amount === "string" ? diceAverage(e.amount) : 0), 0);

  return diceAverage(unit.attacks[0].dice) + extra + getAttackAbilityModifier(abilityScores(unit), unit.attacks[0].type);
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

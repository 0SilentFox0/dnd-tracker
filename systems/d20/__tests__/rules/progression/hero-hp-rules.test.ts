import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { heroBaseHp } from "@/systems/d20/rules/progression/hero-hp";

const hero = { level: 10, constitution: 14, archetype: "warrior" };

const defaults = DEFAULT_RULES.heroScaling;

describe("heroBaseHp з формулою кампанії", () => {
  it("формула за замовчуванням дорівнює поточному значенню", () => {
    expect(heroBaseHp(hero, { ...defaults, hpBaseLevels: 3, hpConCoefficient: 1.5 })).toEqual(heroBaseHp(hero, defaults));
  });

  it("baseLevels 1 і коефіцієнт 1: 1 × 12 + 10 × (12 + 2 × 1) = 152 (типово 186)", () => {
    expect(heroBaseHp(hero, defaults).total).toBe(186);

    const custom = heroBaseHp(hero, { ...defaults, hpBaseLevels: 1, hpConCoefficient: 1 });

    expect(custom.total).toBe(152);
    expect(custom.breakdown[0].params).toMatchObject({ baseLevels: "1", hpPerLevel: "12" });
  });
});

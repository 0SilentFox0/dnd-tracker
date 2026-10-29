import { describe, expect, it } from "vitest";

import { heroBaseHp } from "@/lib/utils/characters/hero-hp";

const hero = { level: 10, constitution: 14, archetype: "warrior" };

describe("heroBaseHp з формулою кампанії", () => {
  it("формула за замовчуванням дорівнює поточному значенню", () => {
    expect(heroBaseHp(hero, { baseLevels: 3, conCoefficient: 1.5 })).toEqual(heroBaseHp(hero));
  });

  it("baseLevels 1 і коефіцієнт 1: 1 × 12 + 10 × (12 + 2 × 1) = 152 (типово 186)", () => {
    expect(heroBaseHp(hero).total).toBe(186);

    const custom = heroBaseHp(hero, { baseLevels: 1, conCoefficient: 1 });

    expect(custom.total).toBe(152);
    expect(custom.breakdown[0].params).toMatchObject({ baseLevels: "1", hpPerLevel: "12" });
  });
});

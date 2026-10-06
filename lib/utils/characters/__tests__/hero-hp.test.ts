import { describe, expect, it } from "vitest";

import { getHeroMaxHp } from "@/lib/constants/hero-scaling";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";

describe("heroBaseHp", () => {
  it("рівень × (10 + мод. сили × 1.5) × коефіцієнт, null-коефіцієнт = 1", () => {
    expect(heroBaseHp({ level: 30, strength: 10, hpMultiplier: null }).total).toBe(300);
    expect(heroBaseHp({ level: 5, strength: 16, hpMultiplier: 1.5 }).total).toBe(108);
  });

  it("збігається з getHeroMaxHp, яким рахувались бій і картка ДМа", () => {
    for (const c of [{ level: 1, strength: 8, hpMultiplier: 1 }, { level: 12, strength: 18, hpMultiplier: 0.5 }, { level: 20, strength: 30 }]) {
      expect(heroBaseHp(c).total).toBe(getHeroMaxHp(c.level, c.strength, { hpMultiplier: c.hpMultiplier ?? 1 }));
    }
  });

  it("розкладка для листа", () => {
    expect(heroBaseHp({ level: 30, strength: 10 }).breakdown.at(-1)).toBe("= 30 × 10 × 1 = 300");
  });
});

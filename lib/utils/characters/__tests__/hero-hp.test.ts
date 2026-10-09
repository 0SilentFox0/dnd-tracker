import { describe, expect, it } from "vitest";

import { heroBaseHp } from "@/lib/utils/characters/hero-hp";

describe("heroBaseHp", () => {
  it("3 × HP/рівень + рівень × (HP/рівень + мод. ВИТ × 1.5)", () => {
    expect(heroBaseHp({ level: 1, constitution: 12 }).total).toBe(41);
    expect(heroBaseHp({ level: 10, constitution: 12, archetype: "warrior" }).total).toBe(171);
    expect(heroBaseHp({ level: 15, constitution: 12, archetype: "paladin" }).total).toBe(256);
    expect(heroBaseHp({ level: 1, constitution: 12, archetype: "mage" }).total).toBe(33);
  });

  it("невідомий архетип = Універсал", () => {
    expect(heroBaseHp({ level: 5, constitution: 10, archetype: "bogus" }).total).toBe(80);
  });

  it("мінімум 1", () => expect(heroBaseHp({ level: 1, constitution: 1, archetype: "mage" }).total).toBeGreaterThanOrEqual(1));

  it("розкладка", () => expect(heroBaseHp({ level: 1, constitution: 12 }).breakdown.at(-1)).toBe("= 30 + 1 × 11.5 = 41"));
});

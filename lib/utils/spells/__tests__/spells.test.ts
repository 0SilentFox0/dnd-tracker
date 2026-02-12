import { describe, expect,it } from "vitest";

import {
  calculateTotalSpellsInGroup,
  formatSpellLevel,
  groupSpellsByGroup,
  sortSpellLevels,
} from "../spells";

import type { Spell } from "@/types/spells";

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: "s1",
    campaignId: "c1",
    name: "Test",
    level: 1,
    type: "target",
    damageType: "damage",
    description: "",
    ...overrides,
  };
}

describe("spells", () => {
  describe("formatSpellLevel", () => {
    it("повертає Cantrip для рівня 0", () => {
      expect(formatSpellLevel(0)).toBe("Cantrip");
    });

    it("повертає Рівень N для N > 0", () => {
      expect(formatSpellLevel(1)).toBe("Рівень 1");
      expect(formatSpellLevel(5)).toBe("Рівень 5");
    });
  });

  describe("groupSpellsByGroup", () => {
    it("групує за spellGroup.name", () => {
      const spells: Spell[] = [
        makeSpell({ id: "a", name: "A", spellGroup: { id: "g1", name: "Dark" } }),
        makeSpell({ id: "b", name: "B", spellGroup: { id: "g1", name: "Dark" } }),
        makeSpell({ id: "c", name: "C", spellGroup: { id: "g2", name: "Light" } }),
      ];

      const grouped = groupSpellsByGroup(spells);

      expect(grouped.get("Dark")).toHaveLength(2);
      expect(grouped.get("Light")).toHaveLength(1);
    });

    it("використовує Без групи якщо spellGroup відсутній", () => {
      const spells: Spell[] = [makeSpell({ spellGroup: null })];

      const grouped = groupSpellsByGroup(spells);

      expect(grouped.get("Без групи")).toHaveLength(1);
    });
  });

  describe("calculateTotalSpellsInGroup", () => {
    it("рахує суму заклинань по рівнях", () => {
      const levels: [string, Spell[]][] = [
        ["Рівень 1", [makeSpell(), makeSpell()]],
        ["Рівень 2", [makeSpell()]],
      ];

      expect(calculateTotalSpellsInGroup(levels)).toBe(3);
    });
  });

  describe("sortSpellLevels", () => {
    it("ставить Cantrip першим", () => {
      const levels: [string, Spell[]][] = [
        ["Рівень 1", []],
        ["Cantrip", []],
      ];

      const sorted = sortSpellLevels(levels);

      expect(sorted[0][0]).toBe("Cantrip");
    });

    it("сортує Рівень N за зростанням", () => {
      const levels: [string, Spell[]][] = [
        ["Рівень 3", []],
        ["Рівень 1", []],
        ["Рівень 2", []],
      ];

      const sorted = sortSpellLevels(levels);

      expect(sorted.map(([l]) => l)).toEqual(["Рівень 1", "Рівень 2", "Рівень 3"]);
    });
  });
});

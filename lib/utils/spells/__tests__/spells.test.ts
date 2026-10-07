import { describe, expect,it } from "vitest";

import {
  calculateTotalSpellsInGroup,
  groupSpellsByGroup,
  sortSpellLevels,
} from "../spells";

import type { Spell } from "@/types/spells";

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: "s1",
    name: "Test",
    level: 1,
    type: "target",
    damageType: "damage",
    description: "",
    ...overrides,
  } as Spell;
}

describe("spells", () => {
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
        ["Перше коло", [makeSpell(), makeSpell()]],
        ["Друге коло", [makeSpell()]],
      ];

      expect(calculateTotalSpellsInGroup(levels)).toBe(3);
    });
  });

  describe("sortSpellLevels", () => {
    it("ставить Cantrip першим", () => {
      const levels: [string, Spell[]][] = [
        ["Перше коло", []],
        ["Замовляння", []],
      ];

      const sorted = sortSpellLevels(levels);

      expect(sorted[0][0]).toBe("Замовляння");
    });

    it("сортує кола за зростанням", () => {
      const levels: [string, Spell[]][] = [
        ["Третє коло", []],
        ["Перше коло", []],
        ["Друге коло", []],
      ];

      const sorted = sortSpellLevels(levels);

      expect(sorted.map(([l]) => l)).toEqual(["Перше коло", "Друге коло", "Третє коло"]);
    });
  });
});

import { describe, expect,it } from "vitest";

import {
  calculateTotalSpellsInGroup,
  convertGroupedSpellsToArray,
  groupSpellsByGroup,
  groupSpellsByGroupAndLevel,
  sortSpellLevels,
} from "../spells";

import { UNGROUPED_KEY } from "@/lib/constants/ungrouped";
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

      expect(grouped.get(UNGROUPED_KEY)).toHaveLength(1);
    });

    it("група з назвою «Без групи» не змішується з відсутньою групою", () => {
      const spells: Spell[] = [
        makeSpell({ id: "a", spellGroup: { id: "g1", name: "Без групи" } }),
        makeSpell({ id: "b", spellGroup: null }),
      ];

      const grouped = groupSpellsByGroup(spells);

      expect(grouped.get("Без групи")?.map((s) => s.id)).toEqual(["a"]);
      expect(grouped.get(UNGROUPED_KEY)?.map((s) => s.id)).toEqual(["b"]);
    });
  });

  describe("calculateTotalSpellsInGroup", () => {
    it("рахує суму заклинань по рівнях", () => {
      const levels: [number, Spell[]][] = [
        [1, [makeSpell(), makeSpell()]],
        [2, [makeSpell()]],
      ];

      expect(calculateTotalSpellsInGroup(levels)).toBe(3);
    });
  });

  describe("sortSpellLevels", () => {
    it("ставить Cantrip першим і сортує за зростанням", () => {
      const levels: [number, Spell[]][] = [[3, []], [0, []], [10, []], [1, []]];

      expect(sortSpellLevels(levels).map(([l]) => l)).toEqual([0, 1, 3, 10]);
    });
  });

  describe("groupSpellsByGroupAndLevel", () => {
    it("групує за числовим рівнем незалежно від мови", () => {
      const spells: Spell[] = [
        makeSpell({ id: "a", name: "B", level: 2, spellGroup: { id: "g1", name: "Dark" } }),
        makeSpell({ id: "b", name: "A", level: 0, spellGroup: { id: "g1", name: "Dark" } }),
        makeSpell({ id: "c", name: "C", level: 2, spellGroup: { id: "g1", name: "Dark" } }),
      ];

      const [[groupName, levels]] = convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(spells));

      expect(groupName).toBe("Dark");
      expect(levels.map(([l, list]) => [l, list.map((s) => s.id)])).toEqual([[0, ["b"]], [2, ["a", "c"]]]);
    });
  });
});

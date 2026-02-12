import { describe, expect,it } from "vitest";

import {
  calculateTotalSkillsInGroup,
  convertGroupedSkillsToArray,
  groupSkillsByMainSkill,
} from "../skills";

import type { MainSkill } from "@/types/main-skills";
import type { GroupedSkill, Skill } from "@/types/skills";

describe("skills utils", () => {
  const mainSkills: MainSkill[] = [
    { id: "ms1", campaignId: "c1", name: "Бойові", color: "#ff0000", createdAt: "", updatedAt: "" },
    { id: "ms2", campaignId: "c1", name: "Магія", color: "#0000ff", createdAt: "", updatedAt: "" },
  ];

  function grouped(id: string, name: string, mainSkillId?: string): GroupedSkill {
    return {
      id,
      campaignId: "c1",
      basicInfo: { name },
      bonuses: {},
      combatStats: {},
      spellData: {},
      spellEnhancementData: {},
      mainSkillData: { mainSkillId },
      skillTriggers: [],
      image: null,
      createdAt: new Date(),
      spell: null,
      spellGroup: null,
    };
  }

  describe("groupSkillsByMainSkill", () => {
    it("групує скіли по mainSkillId", () => {
      const skills = [
        grouped("s1", "Удар", "ms1"),
        grouped("s2", "Блок", "ms1"),
        grouped("s3", "Вогняна куля", "ms2"),
      ];

      const result = groupSkillsByMainSkill(skills, mainSkills);

      expect(result.get("Бойові")).toHaveLength(2);
      expect(result.get("Магія")).toHaveLength(1);
    });

    it("відносить скіли без mainSkillId до «Без основного навику»", () => {
      const skills = [grouped("s1", "Без навику")];

      const result = groupSkillsByMainSkill(skills, mainSkills);

      expect(result.get("Без основного навику")).toHaveLength(1);
    });
  });

  describe("calculateTotalSkillsInGroup", () => {
    it("повертає кількість скілів у масиві", () => {
      const skills = [grouped("s1", "A"), grouped("s2", "B")];

      expect(calculateTotalSkillsInGroup(skills)).toBe(2);
    });
    it("повертає 0 для порожнього масиву", () => {
      expect(calculateTotalSkillsInGroup([])).toBe(0);
    });
  });

  describe("convertGroupedSkillsToArray", () => {
    it("перетворює Map у відсортований масив пар [назва, скіли]", () => {
      const map = new Map<string, (Skill | GroupedSkill)[]>();

      map.set("Бойові", [grouped("s1", "Удар")]);
      map.set("Магія", [grouped("s2", "Вогняна куля")]);

      const arr = convertGroupedSkillsToArray(map);

      expect(arr).toHaveLength(2);
      expect(arr[0][0]).toBe("Бойові");
      expect(arr[1][0]).toBe("Магія");
    });
    it("ставить «Без основного навику» в кінець", () => {
      const map = new Map<string, (Skill | GroupedSkill)[]>();

      map.set("Без основного навику", [grouped("s1", "X")]);
      map.set("А", [grouped("s2", "Y")]);

      const arr = convertGroupedSkillsToArray(map);

      expect(arr[arr.length - 1][0]).toBe("Без основного навику");
    });
  });
});

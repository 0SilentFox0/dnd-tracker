import { describe, expect,it } from "vitest";

import {
  convertGroupedSkillsToArray,
  groupSkillsByMainSkill,
} from "../skills";

import { UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import type { MainSkill } from "@/types/main-skills";
import type { Skill } from "@/types/skills";

describe("skills utils", () => {
  const mainSkills: MainSkill[] = [
    { id: "ms1", campaignId: "c1", name: "Бойові", color: "#ff0000", createdAt: "", updatedAt: "" },
    { id: "ms2", campaignId: "c1", name: "Магія", color: "#0000ff", createdAt: "", updatedAt: "" },
  ];

  function grouped(id: string, name: string, mainSkillId?: string): Skill {
    return {
      id,
      campaignId: "c1",
      name,
      description: null,
      icon: null,
      spellId: null,
      spellGroupId: null,
      mainSkillId,
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

      expect(result.get(UNGROUPED_KEY)).toHaveLength(1);
    });
  });

  describe("convertGroupedSkillsToArray", () => {
    it("перетворює Map у відсортований масив пар [назва, скіли]", () => {
      const map = new Map<string, Skill[]>();

      map.set("Бойові", [grouped("s1", "Удар")]);
      map.set("Магія", [grouped("s2", "Вогняна куля")]);

      const arr = convertGroupedSkillsToArray(map);

      expect(arr).toHaveLength(2);
      expect(arr[0][0]).toBe("Бойові");
      expect(arr[1][0]).toBe("Магія");
    });
    it("основний навик з назвою «Без основного навику» не вважається нерозподіленим", () => {
      const map = new Map<string, Skill[]>();

      map.set(UNGROUPED_KEY, [grouped("s1", "X")]);
      map.set("Без основного навику", [grouped("s2", "Y")]);

      const arr = convertGroupedSkillsToArray(map);

      expect(arr.map(([k]) => k)).toEqual(["Без основного навику", UNGROUPED_KEY]);
    });

    it("ставить «Без основного навику» в кінець", () => {
      const map = new Map<string, Skill[]>();

      map.set(UNGROUPED_KEY, [grouped("s1", "X")]);
      map.set("А", [grouped("s2", "Y")]);

      const arr = convertGroupedSkillsToArray(map);

      expect(arr[arr.length - 1][0]).toBe(UNGROUPED_KEY);
    });
  });
});

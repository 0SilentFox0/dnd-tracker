import { describe, expect,it } from "vitest";

import {
  getSkillDescription,
  getSkillId,
  getSkillMainSkillId,
  getSkillName,
  getSkillSpell,
} from "../skill-helpers";

import type { GroupedSkill, Skill } from "@/types/skills";

describe("skill-helpers", () => {
  describe("getSkillId", () => {
    it("повертає id з GroupedSkill", () => {
      const skill: GroupedSkill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, spellData: {}, mainSkillData: {}, createdAt: new Date(), spell: null, spellGroup: null };

      expect(getSkillId(skill)).toBe("s1");
    });
    it("повертає id з Skill", () => {
      const skill = { id: "s2", campaignId: "c1", name: "Y", description: null, icon: null, spellId: null, spellGroupId: null, createdAt: new Date() } as Skill;

      expect(getSkillId(skill)).toBe("s2");
    });
  });

  describe("getSkillName", () => {
    it("повертає basicInfo.name з GroupedSkill", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "Вогняна куля" }, spellData: {}, mainSkillData: {}, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;

      expect(getSkillName(skill)).toBe("Вогняна куля");
    });
    it("повертає name з Skill", () => {
      const skill = { id: "s1", campaignId: "c1", name: "Удар", description: null, icon: null, spellId: null, spellGroupId: null, createdAt: new Date() } as Skill;

      expect(getSkillName(skill)).toBe("Удар");
    });
  });

  describe("getSkillDescription", () => {
    it("повертає basicInfo.description з GroupedSkill або null", () => {
      const withDesc = { id: "s1", campaignId: "c1", basicInfo: { name: "X", description: "Опис" }, spellData: {}, mainSkillData: {}, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;

      expect(getSkillDescription(withDesc)).toBe("Опис");

      const noDesc = { ...withDesc, basicInfo: { name: "X" } };

      expect(getSkillDescription(noDesc)).toBeNull();
    });
  });

  describe("getSkillSpell", () => {
    it("повертає spell або null", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, spellData: {}, mainSkillData: {}, createdAt: new Date(), spell: { id: "sp1", name: "Fireball" }, spellGroup: null } as GroupedSkill;

      expect(getSkillSpell(skill)).toEqual({ id: "sp1", name: "Fireball" });
      expect(getSkillSpell({ ...skill, spell: null })).toBeNull();
    });
  });

  describe("getSkillMainSkillId", () => {
    it("повертає mainSkillData.mainSkillId з GroupedSkill", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, spellData: {}, mainSkillData: { mainSkillId: "ms1" }, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;

      expect(getSkillMainSkillId(skill)).toBe("ms1");
    });
  });
});

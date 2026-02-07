import { describe, it, expect } from "vitest";
import {
  getSkillId,
  getSkillName,
  getSkillDescription,
  getSkillIcon,
  getSkillBonuses,
  getSkillCombatStats,
  getSkillEffects,
  getSkillTriggers,
  getSkillSpell,
  getSkillMainSkillId,
} from "../skill-helpers";
import type { GroupedSkill, Skill } from "@/types/skills";

describe("skill-helpers", () => {
  describe("getSkillId", () => {
    it("повертає id з GroupedSkill", () => {
      const skill: GroupedSkill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null };
      expect(getSkillId(skill)).toBe("s1");
    });
    it("повертає id з Skill", () => {
      const skill = { id: "s2", campaignId: "c1", name: "Y", description: null, icon: null, bonuses: {}, damage: null, armor: null, speed: null, physicalResistance: null, magicalResistance: null, spellId: null, spellGroupId: null, createdAt: new Date() } as Skill;
      expect(getSkillId(skill)).toBe("s2");
    });
  });

  describe("getSkillName", () => {
    it("повертає basicInfo.name з GroupedSkill", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "Вогняна куля" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillName(skill)).toBe("Вогняна куля");
    });
    it("повертає name з Skill", () => {
      const skill = { id: "s1", campaignId: "c1", name: "Удар", description: null, icon: null, bonuses: {}, damage: null, armor: null, speed: null, physicalResistance: null, magicalResistance: null, spellId: null, spellGroupId: null, createdAt: new Date() } as Skill;
      expect(getSkillName(skill)).toBe("Удар");
    });
  });

  describe("getSkillDescription", () => {
    it("повертає basicInfo.description з GroupedSkill або null", () => {
      const withDesc = { id: "s1", campaignId: "c1", basicInfo: { name: "X", description: "Опис" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillDescription(withDesc)).toBe("Опис");
      const noDesc = { ...withDesc, basicInfo: { name: "X" } };
      expect(getSkillDescription(noDesc)).toBeNull();
    });
  });

  describe("getSkillBonuses", () => {
    it("повертає bonuses або порожній об'єкт", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: { strength: 2 }, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillBonuses(skill)).toEqual({ strength: 2 });
    });
  });

  describe("getSkillCombatStats", () => {
    it("повертає combatStats з GroupedSkill", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: { damage: 5, armor: 10 }, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillCombatStats(skill)).toEqual({ damage: 5, armor: 10 });
    });
  });

  describe("getSkillEffects", () => {
    it("повертає combatStats.effects або порожній масив", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: { effects: [{ stat: "strength", type: "flat", value: 2 }] }, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillEffects(skill)).toHaveLength(1);
      expect(getSkillEffects({ ...skill, combatStats: {} })).toEqual([]);
    });
  });

  describe("getSkillTriggers", () => {
    it("повертає skillTriggers або порожній масив", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [{ type: "simple", trigger: "onHit" }], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillTriggers(skill)).toHaveLength(1);
      expect(getSkillTriggers({ ...skill, skillTriggers: undefined })).toEqual([]);
    });
  });

  describe("getSkillSpell", () => {
    it("повертає spell або null", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: {}, skillTriggers: [], image: null, createdAt: new Date(), spell: { id: "sp1", name: "Fireball" }, spellGroup: null } as GroupedSkill;
      expect(getSkillSpell(skill)).toEqual({ id: "sp1", name: "Fireball" });
      expect(getSkillSpell({ ...skill, spell: null })).toBeNull();
    });
  });

  describe("getSkillMainSkillId", () => {
    it("повертає mainSkillData.mainSkillId з GroupedSkill", () => {
      const skill = { id: "s1", campaignId: "c1", basicInfo: { name: "X" }, bonuses: {}, combatStats: {}, spellData: {}, spellEnhancementData: {}, mainSkillData: { mainSkillId: "ms1" }, skillTriggers: [], image: null, createdAt: new Date(), spell: null, spellGroup: null } as GroupedSkill;
      expect(getSkillMainSkillId(skill)).toBe("ms1");
    });
  });
});

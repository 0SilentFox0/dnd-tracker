import { describe, expect,it } from "vitest";

import {
  calculateHPGain,
  getAbilityModifier,
  getLevelFromXP,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
  getXPForLevel,
  isHit,
} from "../calculations";
import { getAttackAbilityModifier } from "../calculations";

import { AttackType } from "@/lib/constants/battle";

describe("calculations", () => {
  describe("getAbilityModifier", () => {
    it("повертає 0 для 10–11", () => {
      expect(getAbilityModifier(10)).toBe(0);
      expect(getAbilityModifier(11)).toBe(0);
    });
    it("округлює вниз (score - 10) / 2", () => {
      expect(getAbilityModifier(12)).toBe(1);
      expect(getAbilityModifier(8)).toBe(-1);
    });
  });

  describe("getProficiencyBonus", () => {
    it("повертає 2 для рівня 1–4", () => {
      expect(getProficiencyBonus(1)).toBe(2);
      expect(getProficiencyBonus(4)).toBe(2);
    });
    it("зростає з рівнем", () => {
      expect(getProficiencyBonus(5)).toBe(3);
    });
  });

  describe("getSpellSaveDC", () => {
    it("8 + proficiency + ability modifier", () => {
      expect(getSpellSaveDC(2, 3)).toBe(13);
    });
  });

  describe("getSpellAttackBonus", () => {
    it("proficiency + ability modifier", () => {
      expect(getSpellAttackBonus(2, 3)).toBe(5);
    });
  });

  describe("getXPForLevel", () => {
    it("рівень 1 = 1000 XP", () => {
      expect(getXPForLevel(1)).toBe(1000);
    });
    it("кожен наступний рівень = попередній * multiplier", () => {
      expect(getXPForLevel(2, 2.5)).toBe(2500);
    });
  });

  describe("getLevelFromXP", () => {
    it("0 XP = рівень 1", () => {
      expect(getLevelFromXP(0)).toBe(1);
    });
    it("1000+ XP = рівень 2", () => {
      expect(getLevelFromXP(1000)).toBe(2);
    });
  });

  describe("calculateHPGain", () => {
    it("парсить 1d8 і повертає середнє + CON modifier", () => {
      const gain = calculateHPGain("1d8", 1);

      expect(gain).toBeGreaterThan(0);
    });
    it("повертає 0 для невалідного hitDice", () => {
      expect(calculateHPGain("invalid", 0)).toBe(0);
    });
  });

  describe("isHit", () => {
    it("roll >= AC = попадання", () => {
      expect(isHit(15, 14)).toBe(true);
      expect(isHit(14, 15)).toBe(false);
    });
  });

});

describe("getAttackAbilityModifier", () => {
  it("ближня — Сила, дальня — Спритність", () => {
    const abilities = { strength: 16, dexterity: 12 };

    expect(getAttackAbilityModifier(abilities, AttackType.MELEE)).toBe(3);
    expect(getAttackAbilityModifier(abilities, AttackType.RANGED)).toBe(1);
  });
});

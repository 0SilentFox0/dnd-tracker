import { describe, expect,it } from "vitest";

import {
  calculateHPGain,
  getAbilityModifier,
  getLevelFromXP,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
  getXPForLevel,
  isCriticalHit,
  isCriticalMiss,
  isHit,
  rollDamage,
} from "../calculations";
import { getAttackDamageModifier } from "../calculations";

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

  describe("getPassiveScore", () => {
    it("10 + modifier без proficiency", () => {
      expect(getPassiveScore(2, false, 2)).toBe(12);
    });
    it("10 + modifier + proficiency якщо є", () => {
      expect(getPassiveScore(2, true, 2)).toBe(14);
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

  describe("rollDamage", () => {
    it("парсить 2d6 і повертає число", () => {
      const dmg = rollDamage("2d6");

      expect(typeof dmg).toBe("number");
      expect(dmg).toBeGreaterThan(0);
    });
    it("повертає 0 для невалідного формату", () => {
      expect(rollDamage("x")).toBe(0);
    });
  });

  describe("isCriticalHit / isCriticalMiss", () => {
    it("20 = критичне влучання", () => {
      expect(isCriticalHit(20)).toBe(true);
      expect(isCriticalHit(19)).toBe(false);
    });
    it("1 = критичний промах", () => {
      expect(isCriticalMiss(1)).toBe(true);
      expect(isCriticalMiss(2)).toBe(false);
    });
  });

  describe("isHit", () => {
    it("roll >= AC = попадання", () => {
      expect(isHit(15, 14)).toBe(true);
      expect(isHit(14, 15)).toBe(false);
    });
  });

  describe("getAttackDamageModifier", () => {
    it("MELEE використовує силу", () => {
      expect(getAttackDamageModifier(AttackType.MELEE, 14, 10)).toBe(2);
    });
    it("RANGED використовує спритність", () => {
      expect(getAttackDamageModifier(AttackType.RANGED, 10, 16)).toBe(3);
    });
  });
});

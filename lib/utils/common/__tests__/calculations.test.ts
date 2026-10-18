import { describe, expect,it } from "vitest";

import {
  getAbilityModifier,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
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

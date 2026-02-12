import { describe, expect,it } from "vitest";

import {
  determineConcentration,
  determineSavingThrowAbility,
  determineSavingThrowOnSuccess,
  determineSpellDamageType,
  determineSpellType,
  extractDamageDice,
  normalizeSchoolName,
  parseDiceString,
} from "../spell-parsing";

import { SpellDamageType, SpellType } from "@/lib/constants/spell-abilities";

describe("spell-parsing", () => {
  describe("determineSpellType", () => {
    it("повертає AOE для опису з aoe/area/line/wall", () => {
      expect(determineSpellType("AOE 20 feet")).toBe(SpellType.AOE);
      expect(determineSpellType("area of effect")).toBe(SpellType.AOE);
      expect(determineSpellType("line 100 ft")).toBe(SpellType.AOE);
      expect(determineSpellType("wall of fire")).toBe(SpellType.AOE);
    });

    it("повертає TARGET для опису без AOE ключових слів", () => {
      expect(determineSpellType("Single target damage")).toBe(SpellType.TARGET);
      expect(determineSpellType("Touch")).toBe(SpellType.TARGET);
    });
  });

  describe("determineSpellDamageType", () => {
    it("повертає HEAL для heal/regeneration/resurrection", () => {
      expect(determineSpellDamageType("heal 2d8")).toBe(SpellDamageType.HEAL);
      expect(determineSpellDamageType("regeneration")).toBe(SpellDamageType.HEAL);
      expect(determineSpellDamageType("resurrection")).toBe(SpellDamageType.HEAL);
    });

    it("повертає DAMAGE для урону", () => {
      expect(determineSpellDamageType("8d6 fire")).toBe(SpellDamageType.DAMAGE);
      expect(determineSpellDamageType("deal damage")).toBe(SpellDamageType.DAMAGE);
    });
  });

  describe("extractDamageDice", () => {
    it("витягує NdM з опису", () => {
      expect(extractDamageDice("8d6 fire")).toBeDefined();
      expect(extractDamageDice("3d8 necrotic")).toMatch(/\d+d\d+/);
      expect(extractDamageDice("2d8+4 HP")).toBeDefined();
    });

    it("повертає undefined якщо немає кубиків", () => {
      expect(extractDamageDice("None")).toBeUndefined();
      expect(extractDamageDice("Speed halved")).toBeUndefined();
    });
  });

  describe("parseDiceString", () => {
    it("парсить 2d6, 1d8 тощо", () => {
      expect(parseDiceString("2d6")).toEqual({ diceCount: 2, diceType: "d6" });
      expect(parseDiceString("1d8")).toEqual({ diceCount: 1, diceType: "d8" });
      expect(parseDiceString("4d6")).toEqual({ diceCount: 4, diceType: "d6" });
    });

    it("повертає null для невалідного типу кубика", () => {
      expect(parseDiceString("1d3")).toEqual({ diceCount: null, diceType: null });
    });

    it("повертає null для порожнього або undefined", () => {
      expect(parseDiceString("")).toEqual({ diceCount: null, diceType: null });
      expect(parseDiceString(undefined)).toEqual({ diceCount: null, diceType: null });
    });

    it("повертає null для count > 10 або < 0", () => {
      expect(parseDiceString("11d6").diceCount).toBeNull();
    });
  });

  describe("determineSavingThrowAbility", () => {
    it("знаходить характеристику в описі", () => {
      expect(determineSavingThrowAbility("Constitution save")).toBe("constitution");
      expect(determineSavingThrowAbility("Dexterity save")).toBe("dexterity");
      expect(determineSavingThrowAbility("wisdom save half")).toBe("wisdom");
    });

    it("повертає undefined якщо не знайдено", () => {
      expect(determineSavingThrowAbility("No save")).toBeUndefined();
    });
  });

  describe("determineSavingThrowOnSuccess", () => {
    it("повертає HALF якщо є half або /2", () => {
      expect(determineSavingThrowOnSuccess("save for half")).toBe("half");
      expect(determineSavingThrowOnSuccess("damage/2 on success")).toBe("half");
    });

    it("повертає NONE якщо немає half", () => {
      expect(determineSavingThrowOnSuccess("no effect on save")).toBe("none");
    });
  });

  describe("determineConcentration", () => {
    it("повертає true для concentration", () => {
      expect(determineConcentration("Concentration, 1 minute")).toBe(true);
      expect(determineConcentration("conc. up to 1 min")).toBe(true);
    });

    it("повертає false без концентрації", () => {
    expect(determineConcentration("Instantaneous")).toBe(false);
    });
  });

  describe("normalizeSchoolName", () => {
    it("мапить скорочення школи", () => {
      expect(normalizeSchoolName("Dark")).toBe("Necromancy");
      expect(normalizeSchoolName("Light")).toBe("Abjuration");
    });

    it("повертає оригінал якщо немає маппінгу", () => {
      expect(normalizeSchoolName("Evocation")).toBe("Evocation");
    });
  });
});

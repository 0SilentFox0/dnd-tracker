import { describe, expect, it } from "vitest";

import {
  calculatePercentBonus,
  formatFlatBonusBreakdown,
  formatPercentBonusBreakdown,
  matchesAttackType,
} from "../common/modifiers";

import { AttackType } from "@/lib/constants/battle";

describe("battle-modifiers-common", () => {
  describe("matchesAttackType", () => {
    it("returns true for melee_damage when attackType is MELEE", () => {
      expect(matchesAttackType("melee_damage", AttackType.MELEE)).toBe(true);
    });

    it("returns false for melee_damage when attackType is RANGED", () => {
      expect(matchesAttackType("melee_damage", AttackType.RANGED)).toBe(false);
    });

    it("returns true for ranged_damage when attackType is RANGED", () => {
      expect(matchesAttackType("ranged_damage", AttackType.RANGED)).toBe(true);
    });

    it("returns false for ranged_damage when attackType is MELEE", () => {
      expect(matchesAttackType("ranged_damage", AttackType.MELEE)).toBe(false);
    });

    it("returns true for physical_damage for both MELEE and RANGED", () => {
      expect(matchesAttackType("physical_damage", AttackType.MELEE)).toBe(true);
      expect(matchesAttackType("physical_damage", AttackType.RANGED)).toBe(true);
    });

    it("returns true for all_damage for both MELEE and RANGED", () => {
      expect(matchesAttackType("all_damage", AttackType.MELEE)).toBe(true);
      expect(matchesAttackType("all_damage", AttackType.RANGED)).toBe(true);
    });

    it("matches legacy format melee_damage_percent for MELEE", () => {
      expect(matchesAttackType("melee_damage_percent", AttackType.MELEE)).toBe(true);
    });

    it("matches legacy format ranged_damage_percent for RANGED", () => {
      expect(matchesAttackType("ranged_damage_percent", AttackType.RANGED)).toBe(true);
    });

    it("returns false for unrelated stat", () => {
      expect(matchesAttackType("hp_bonus", AttackType.MELEE)).toBe(false);
      expect(matchesAttackType("initiative", AttackType.RANGED)).toBe(false);
    });
  });

  describe("calculatePercentBonus", () => {
    it("returns 0 when percentBonus is 0", () => {
      expect(calculatePercentBonus(100, 0)).toBe(0);
    });

    it("returns 0 when percentBonus is negative", () => {
      expect(calculatePercentBonus(100, -10)).toBe(0);
    });

    it("returns floor of baseValue * percent / 100 for positive percent", () => {
      expect(calculatePercentBonus(100, 25)).toBe(25);
      expect(calculatePercentBonus(40, 30)).toBe(12);
    });

    it("rounds down (floor)", () => {
      expect(calculatePercentBonus(100, 33)).toBe(33);
      expect(calculatePercentBonus(10, 15)).toBe(1);
    });
  });

  describe("formatPercentBonusBreakdown", () => {
    it("returns empty string when percent is 0", () => {
      expect(formatPercentBonusBreakdown("Бонуси зі скілів", 0)).toBe("");
    });

    it("returns formatted string for positive percent", () => {
      expect(formatPercentBonusBreakdown("Бонуси зі скілів", 30)).toBe(
        "Бонуси зі скілів: +30%",
      );
    });
  });

  describe("formatFlatBonusBreakdown", () => {
    it("returns empty string when flat is 0", () => {
      expect(formatFlatBonusBreakdown("Flat бонус", 0)).toBe("");
    });

    it("returns empty string when flat is negative", () => {
      expect(formatFlatBonusBreakdown("Flat бонус", -5)).toBe("");
    });

    it("returns formatted string for positive flat", () => {
      expect(formatFlatBonusBreakdown("Flat бонус зі скілів", 3)).toBe(
        "Flat бонус зі скілів: +3",
      );
    });
  });
});

import { describe, expect,it } from "vitest";

import {
  calculateAverageSpellEffect,
  formatSpellAverage,
} from "../spell-calculations";

describe("spell-calculations", () => {
  describe("calculateAverageSpellEffect", () => {
    it("повертає 0 для null/undefined", () => {
      expect(calculateAverageSpellEffect(null, "d6")).toBe(0);
      expect(calculateAverageSpellEffect(2, null)).toBe(0);
      expect(calculateAverageSpellEffect(undefined, undefined)).toBe(0);
    });

    it("рахує середнє для d6: (6+1)/2 = 3.5 на кубик", () => {
      expect(calculateAverageSpellEffect(1, "d6")).toBe(3.5);
      expect(calculateAverageSpellEffect(2, "d6")).toBe(7);
      expect(calculateAverageSpellEffect(4, "d6")).toBe(14);
    });

    it("рахує середнє для d8", () => {
      expect(calculateAverageSpellEffect(1, "d8")).toBe(4.5);
      expect(calculateAverageSpellEffect(3, "d8")).toBe(13.5);
    });
  });

  describe("formatSpellAverage", () => {
    it("повертає порожній рядок для 0", () => {
      expect(formatSpellAverage("damage", 0)).toBe("");
    });

    it("форматує урон та лікування", () => {
      expect(formatSpellAverage("damage", 14)).toContain("шкоди");
      expect(formatSpellAverage("heal", 10)).toContain("лікування");
      expect(formatSpellAverage("all", 7)).toContain("ефекту");
    });
  });
});

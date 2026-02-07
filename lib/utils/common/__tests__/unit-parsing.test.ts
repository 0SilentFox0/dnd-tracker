import { describe, it, expect } from "vitest";
import {
  parseAbilityScore,
  parseArmorClass,
  parseMaxHp,
  parseSpeed,
  parseLevel,
} from "../unit-parsing";

describe("unit-parsing", () => {
  describe("parseAbilityScore", () => {
    it("парсить число з рядка", () => {
      expect(parseAbilityScore("14")).toBe(14);
      expect(parseAbilityScore("8 (+1)")).toBe(8);
    });
    it("повертає 10 для порожнього або невалідного", () => {
      expect(parseAbilityScore("")).toBe(10);
    });
  });

  describe("parseArmorClass", () => {
    it("парсить AC з рядка", () => {
      expect(parseArmorClass("15")).toBe(15);
      expect(parseArmorClass("12 (natural armor)")).toBe(12);
    });
    it("повертає 10 за замовчуванням", () => {
      expect(parseArmorClass("")).toBe(10);
    });
  });

  describe("parseMaxHp", () => {
    it("парсить HP перед дужками", () => {
      expect(parseMaxHp("18 (4к6 + 4)")).toBe(18);
    });
    it("парсить просте число", () => {
      expect(parseMaxHp("22")).toBe(22);
    });
    it("повертає 10 за замовчуванням", () => {
      expect(parseMaxHp("")).toBe(10);
    });
  });

  describe("parseSpeed", () => {
    it("парсить швидкість з рядка", () => {
      expect(parseSpeed("30 фт.")).toBe(30);
      expect(parseSpeed("25")).toBe(25);
    });
    it("повертає 30 за замовчуванням", () => {
      expect(parseSpeed("")).toBe(30);
    });
  });

  describe("parseLevel", () => {
    it("парсить рівень", () => {
      expect(parseLevel("3")).toBe(3);
    });
    it("повертає 1 за замовчуванням", () => {
      expect(parseLevel("")).toBe(1);
    });
  });
});

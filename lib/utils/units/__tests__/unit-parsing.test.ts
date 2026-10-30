import { describe, expect, it } from "vitest";

import {
  convertCSVRowsToUnits,
  convertCSVRowToUnit,
  parseAbilityScore,
  parseArmorClass,
  parseAttacks,
  parseLevel,
  parseMaxHp,
  parseSpeed,
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

  describe("convertCSVRowsToUnits", () => {
    it("пропускає рядки з порожньою назвою", () => {
      const units = convertCSVRowsToUnits([{ Назва: "Гоблін" }, { Назва: "  " }, {}]);

      expect(units.map((u) => u.name)).toEqual(["Гоблін"]);
    });
  });

  describe("convertCSVRowToUnit", () => {
    it("колонка «Група» стає назвою раси", () => {
      expect(convertCSVRowToUnit({ Назва: "Гоблін", Група: " Гобліни " })).toMatchObject({ name: "Гоблін", raceName: "Гобліни" });
    });

    it("uk і en заголовки колонок дають однаковий результат", () => {
      const uk = convertCSVRowToUnit({ Назва: "Вовк", Група: "Звірі", КД: "13", ХП: "11 (2к8 + 2)", Швидкість: "40", СИЛ: "12", ЛОВ: "15", ТІЛ: "12", ІНТ: "3", МДР: "12", ХАР: "6", Атаки: "Укус +4, 2к4 колючий", Особливості: "Нюх" });

      const en = convertCSVRowToUnit({ name: "Вовк", group: "Звірі", ac: "13", hp: "11 (2d8 + 2)", speed: "40", str: "12", dex: "15", con: "12", int: "3", wis: "12", cha: "6", attacks: "Укус +4, 2k4 piercing", features: "Нюх" });

      expect(uk).toEqual(en);
      expect(uk).toMatchObject({ armorClass: 13, maxHp: 11, speed: 40, dexterity: 15, attacks: [{ name: "Укус", attackBonus: 4, damageType: "piercing", damageDice: "2d4" }] });
    });

    it("легасі-атаки: типи шкоди uk/en, «Відсутні» і к-кубики", () => {
      expect(parseAttacks("Відсутні")).toEqual([]);
      expect(parseAttacks("Кігті +6, 2к6 рублячий")[0]).toMatchObject({ damageType: "slashing", damageDice: "2d6" });
      expect(parseAttacks("Flame +3, 1d6 fire")[0]).toMatchObject({ damageType: "fire" });
      expect(parseAttacks("Дихання +3, 1к6 холод")[0]).toMatchObject({ damageType: "cold" });
      expect(parseAttacks("Slam_1к8+2")[0]).toMatchObject({ damageDice: "1d8+2" });
    });

    it("без групи — без raceName", () => {
      expect(convertCSVRowToUnit({ Назва: "Вовк" })).not.toHaveProperty("raceName");
    });
  });
});

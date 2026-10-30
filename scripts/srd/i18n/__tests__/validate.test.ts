import { describe, expect, it } from "vitest";

import { checkTranslation } from "../validate";

const TABLE = "Table: Draconic Ancestors\n\n| Dragon | Damage Type |\n| --- | --- |\n| Black | Acid |";

describe("checkTranslation", () => {
  it("приймає коректний переклад", () => {
    expect(checkTranslation("Deal 2d6 damage within 30 feet. **Bold**", "Завдай 2d6 шкоди в межах 30 футів. **Жирний**")).toEqual([]);
    expect(checkTranslation(TABLE, "Table: Драконячі предки\n\n| Дракон | Тип шкоди |\n| --- | --- |\n| Чорний | Кислота |")).toEqual([]);
  });

  it("кубики порівнюються без урахування регістру", () => {
    expect(checkTranslation("Roll a D20 and 2D6", "Кинь d20 і 2d6")).toEqual([]);
    expect(checkTranslation("roll d6s", "кинь d6")).toEqual([]);
  });

  it("ловить зникле число і змінений кубик", () => {
    expect(checkTranslation("Range 30 feet", "Дальність футів")).toContain("numbers");
    expect(checkTranslation("Deal 2d6", "Завдай 2d8")).toEqual(expect.arrayContaining(["dice", "numbers"]));
  });

  it("ловить іншу кількість колонок і рядків таблиці", () => {
    expect(checkTranslation(TABLE, "Table: X\n\n| Дракон |\n| --- |\n| Чорний |")).toContain("table-shape");
    expect(checkTranslation(TABLE, "Table: X\n\n| Дракон | Тип шкоди |\n| --- | --- |")).toEqual(expect.arrayContaining(["table-shape", "lines"]));
  });

  it("ловить зміну знака й втрачений одинарний *", () => {
    expect(checkTranslation("Gain +5 to rolls", "Отримай -5 до кидків")).toContain("numbers");
    expect(checkTranslation("Range 5-7 feet", "Дальність 5–7 футів")).toEqual([]);
    expect(checkTranslation("cast *Fireball*", "створи Вогняну кулю")).toContain("markup");
  });

  it("ловить втрачений ** і порожній переклад", () => {
    expect(checkTranslation("A **b** c", "А б в")).toContain("markup");
    expect(checkTranslation("Alert", "  ")).toEqual(["empty"]);
  });

  it("ловить переклад префікса Table:", () => {
    expect(checkTranslation("Table: X\n\n| a |", "Таблиця: X\n\n| а |")).toContain("table-prefix");
  });
});

import { describe, expect, it } from "vitest";

import { normalizeSpellHeader } from "../spell-header";

const glossary = { Level: "Рівень", Cantrip: "замовляння", "Casting Time": "Час накладання", Range: "Дистанція", Components: "Компоненти", Duration: "Тривалість", Classes: "Класи", V: "В", S: "С", M: "М", Evocation: "Втілення" };

const EN = "Level 3 Evocation · Casting Time: Action · Range: 150 feet · Components: V, S, M (a bit of fur) · Duration: Instantaneous · Classes: Sorcerer, Wizard\n\nBody.";

describe("normalizeSpellHeader", () => {
  it("відновлює мітки, порядок рівня/школи, букви компонентів і регістр значень", () => {
    const tr = "Втілення 3 рівня · Час: Дія · Дальність: 150 футів · Компоненти: V, S, M (трохи хутра) · Тривалість: Миттєва · Класи: Чародій, Маг\n\nТіло.";

    expect(normalizeSpellHeader(EN, tr, glossary)).toBe("Рівень 3, Втілення · Час накладання: дія · Дистанція: 150 футів · Компоненти: В, С, М (трохи хутра) · Тривалість: миттєва · Класи: Чародій, Маг\n\nТіло.");
  });

  it("замовляння: школа, потім слово замовляння", () => {
    const en = "Evocation Cantrip · Casting Time: Action · Range: Self · Components: V · Duration: Instantaneous · Classes: Wizard";

    expect(normalizeSpellHeader(en, "x · Час: Дія · Д: Себе · К: В · Т: Миттєва · Класи: Маг", glossary)).toBe("Втілення, замовляння · Час накладання: дія · Дистанція: себе · Компоненти: В · Тривалість: миттєва · Класи: Маг");
  });

  it("не чіпає не-шапки й розбіжну кількість частин", () => {
    expect(normalizeSpellHeader("Just text", "Просто текст", glossary)).toBe("Просто текст");
    expect(normalizeSpellHeader(EN, "Рівень 3 · щось", glossary)).toBe("Рівень 3 · щось");
  });
});

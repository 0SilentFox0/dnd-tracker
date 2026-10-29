import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { chunkRows, detectDelimiter, ImportFileError, parseTable, toCsv } from "../table";

describe("detectDelimiter", () => {
  it.each([
    ["a;b;c", ";"],
    ["a\tb\tc", "\t"],
    ["a,b,c", ","],
    ["a;b,c", ";"],
    ['"a;b",c,d', ","],
    ["abc", ","],
  ])("%j → %j", (line, expected) => expect(detectDelimiter(line)).toBe(expected));
});

describe("parseTable: CSV", () => {
  it("BOM, ;, CRLF, лапки з переносом і подвоєними лапками, рядок з самих роздільників", () => {
    const text = '﻿Назва;Опис\r\n"Біс";"рядок 1\nрядок 2 ""цитата"""\r\n;\r\nВовк;;\r\n';

    const table = parseTable(text, "units.csv");

    expect(table.format).toBe("csv");
    expect(table.headers).toEqual(["Назва", "Опис"]);
    expect(table.rows).toEqual([
      { Назва: "Біс", Опис: 'рядок 1\nрядок 2 "цитата"' },
      { Назва: "Вовк", Опис: "" },
    ]);
  });

  it("клітинка, цілком обгорнута в лапки (\"\"\"текст\"\"\"), втрачає одну пару — як у старому імпорті", () => {
    expect(parseTable('Назва;Опис\nА;"""Аура; Натиск"""').rows).toEqual([{ Назва: "А", Опис: "Аура; Натиск" }]);
  });

  it("кома й табуляція", () => {
    expect(parseTable("name,hp\nВовк,11").rows).toEqual([{ name: "Вовк", hp: "11" }]);
    expect(parseTable("name\thp\nВовк\t11").rows).toEqual([{ name: "Вовк", hp: "11" }]);
  });

  it("порожні й повторені заголовки отримують унікальні імена", () => {
    expect(parseTable("Назва;Назва;\nА;Б;В").headers).toEqual(["Назва", "Назва (2)", "Column 3"]);
    expect(parseTable("Назва;\nА;Б", "", { blankHeader: (n) => `Колонка ${n}` }).headers).toEqual(["Назва", "Колонка 2"]);
  });

  it("порожній файл і лише заголовок — ImportFileError", () => {
    expect(() => parseTable("")).toThrow(ImportFileError);
    expect(() => parseTable("Назва;ХП\n")).toThrow("contentImport.file.noRows");
  });

  it("units-all.csv: 104 рядки по 18 колонок, ; у лапках лишається в клітинці", () => {
    const table = parseTable(fs.readFileSync(path.join(process.cwd(), "docs/units/units-all.csv"), "utf8"), "units-all.csv");

    expect(table.headers).toHaveLength(18);
    expect(table.rows).toHaveLength(104);
    expect(table.rows.find((r) => r["Назва"] === "Fire Dragon")?.["Особливості"]).toBe("Poisoned;Frightened;Charmed;Blinded, Fire;Poison");
    expect(table.rows.find((r) => r["Назва"] === "Єдинорог")?.["Навички/Здібності"]).toBe("Magic Resistance Aura; Charge");
  });
});

describe("parseTable: JSON", () => {
  it("масив об'єктів — заголовки в порядку появи", () => {
    const table = parseTable('[{"name":"Вовк","maxHp":11},{"name":"Біс","cr":0.25}]', "units.json");

    expect(table.format).toBe("json");
    expect(table.headers).toEqual(["name", "maxHp", "cr"]);
    expect(table.rows[1]).toEqual({ name: "Біс", cr: 0.25 });
  });

  it("один об'єкт і впізнавання JSON без розширення", () => {
    expect(parseTable('{"name":"Вовк"}').rows).toEqual([{ name: "Вовк" }]);
  });

  it("некоректний JSON і масив не-об'єктів — ImportFileError", () => {
    expect(() => parseTable("[1,2]", "a.json")).toThrow(ImportFileError);
    expect(() => parseTable("{oops", "a.json")).toThrow("contentImport.file.badJson");
  });
});

describe("toCsv", () => {
  it("BOM, ; і лапки там, де треба; читається назад тим самим", () => {
    const csv = toCsv(["Назва", "Опис"], [["Вогонь, сильний", 'лапки "тут"\nі перенос'], ["Лід", ""]]);

    expect(csv.startsWith("﻿Назва;Опис\r\n")).toBe(true);
    expect(parseTable(csv).rows).toEqual([
      { Назва: "Вогонь, сильний", Опис: 'лапки "тут"\nі перенос' },
      { Назва: "Лід", Опис: "" },
    ]);
  });
});

describe("chunkRows", () => {
  it("ділить за кількістю рядків", () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ i }));

    expect(chunkRows(rows, 100, 1_000_000).map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it("ділить за розміром UTF-8, рядок більший за ліміт іде сам", () => {
    const big = { text: "ї".repeat(60) };

    expect(chunkRows([big, big, big], 100, 250).map((c) => c.length)).toEqual([1, 1, 1]);
    expect(chunkRows([], 100, 250)).toEqual([]);
  });
});

describe("aggregate JSON dispatch", () => {
  it("never offers column mapping for compendium categories or metadata", () => {
    expect(() => parseTable('{"spell":[{"name":"Synthetic"}]}', "test.json")).toThrow("JSON_COMPENDIUM");
    expect(() => parseTable('{"_meta":{"sources":[]},"unknown":[]}', "test.json")).toThrow("JSON_COMPENDIUM");
    expect(parseTable('{"name":"Synthetic", "description":"simple"}', "test.json").rows).toHaveLength(1);
  });
});

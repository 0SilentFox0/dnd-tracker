import { describe, expect, it } from "vitest";

import { IMPORT_SPECS } from "../fields";
import { coerceRecord, recordToCells } from "../mapping";
import { parseTable, toCsv } from "../table";
import { parseFieldValue } from "../values";
import { decodeImportBytes } from "../wizard";

import type { ImportField } from "@/types/content-import";

const units = IMPORT_SPECS.units.fields;

const spells = IMPORT_SPECS.spells.fields;

const field = (fields: typeof units, key: string) => fields.find((f) => f.key === key) as ImportField;

describe("формули в CSV", () => {
  it("клітинки з = + - @ отримують апостроф, прості числа — ні, імпорт його знімає", () => {
    const csv = toCsv(["a"], [["+1 до КД"], ["=SUM(A1)"], ["@x"], ["-5"], ["+3"], ["звичайний"]]);

    expect(csv).toContain("'+1 до КД");
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain("'@x");
    expect(csv).toContain("\r\n-5\r\n");
    expect(csv).toContain("\r\n+3\r\n");
    expect(parseTable(csv).rows.map((r) => r.a)).toEqual(["'+1 до КД", "'=SUM(A1)", "'@x", "-5", "+3", "звичайний"]);
    expect(parseFieldValue(field(units, "name"), "'+1 до КД")).toEqual({ value: "+1 до КД" });
  });

  it("круговий шлях: опис з «+1 до КД», CR як десяткове, Excel-перезбереження з комою", () => {
    const spec = IMPORT_SPECS.units;

    const record = { name: "Вовк", cr: 0.25, abilities: undefined, attacks: [] };

    const cells = recordToCells(spec, { ...record, description: "+1 до КД" } as never, () => undefined);

    expect(cells[spec.fields.findIndex((f) => f.key === "cr")]).toBe("0.25");

    const skills = IMPORT_SPECS.skills.fields;

    const csv = toCsv(skills.map((f) => f.label), [recordToCells(IMPORT_SPECS.skills, { name: "Бонус", description: "+1 до КД" }, () => undefined)]);

    const [row] = parseTable(csv).rows;

    const header = field(skills, "description").label;

    expect(coerceRecord({ description: row[header] }, skills).value.description).toBe("+1 до КД");
    expect(parseFieldValue(field(units, "cr"), "0,25")).toEqual({ value: 0.25 });
  });
});

describe("кодування файлу", () => {
  it("UTF-8 читається як є", () => {
    expect(decodeImportBytes(new TextEncoder().encode("Назва;КД"))).toBe("Назва;КД");
  });

  it("windows-1251 розпізнається", () => {
    const bytes = Uint8Array.from([0xcd, 0xe0, 0xe7, 0xe2, 0xe0, 0x3b, 0xca, 0xc4]);

    expect(decodeImportBytes(bytes)).toBe("Назва;КД");
  });
});

describe("м'які значення необов'язкових полів", () => {
  it("необов'язкове поле з непрозорим значенням — попередження і поле прибрано", () => {
    const { value, issues } = coerceRecord({ name: "Вогонь", cost: "1 minute", level: "huh" }, spells);

    expect(value).toEqual({ name: "Вогонь" });
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.level === "warning")).toBe(true);
    expect(issues[0].message).toContain("Колонка «Вартість»");
    expect(issues[0].message).toContain("1 minute");
  });

  it("обов'язкове поле лишається помилкою", () => {
    const required = [{ ...field(units, "level"), required: true }];

    expect(coerceRecord({ level: "huh" }, required).issues[0].level).toBe("error");
  });

  it("популярні формати", () => {
    expect(parseFieldValue(field(units, "cr"), "CR 1/4 (50 XP)")).toEqual({ value: 0.25 });
    expect(parseFieldValue(field(units, "cr"), "2")).toEqual({ value: 2 });
    expect(parseFieldValue(field(spells, "level"), "Cantrip")).toEqual({ value: 0 });
    expect(parseFieldValue(field(spells, "level"), "Замовляння")).toEqual({ value: 0 });
    expect(parseFieldValue(field(spells, "cost"), "1 action")).toEqual({ value: "action" });
    expect(parseFieldValue(field(spells, "cost"), "1 Bonus Action")).toEqual({ value: "bonusAction" });
    expect(parseFieldValue(field(spells, "dice"), "1д6")).toEqual({ value: "1d6" });

    for (const mark of ["—", "–", "-", ""]) expect(parseFieldValue(field(units, "armorClass"), mark)).toEqual({});
  });

  it("рядок sep=; на початку пропускається", () => {
    expect(parseTable("sep=;\r\nA;B\r\n1;2\r\n").headers).toEqual(["A", "B"]);
  });
});

describe("мінорні виправлення рев'ю", () => {
  it("значення з апострофом перед формульним символом захищається і повертається назад", () => {
    const csv = toCsv(["a"], [["'+x"], ["'abc"]]);

    expect(parseTable(csv).rows.map((r) => r.a)).toEqual(["''+x", "'abc"]);
    expect(parseFieldValue(field(units, "name"), "''+x")).toEqual({ value: "'+x" });
  });

  it("CR розпізнається на початку, а зіпсовані Excel дати — ні", () => {
    const cr = field(units, "cr");

    expect(parseFieldValue(cr, "1/4 (50 XP)")).toEqual({ value: 0.25 });
    expect(parseFieldValue(cr, "CR 5")).toEqual({ value: 5 });
    expect(parseFieldValue(cr, "01.апр").issue).toBeDefined();
    expect(parseFieldValue(cr, "1-Apr").issue).toBeDefined();
  });
});

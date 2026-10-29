import { describe, expect, it } from "vitest";

import { applyMapping, autoMap, coerceRecord, duplicateTargets, missingRequired, nameKey, recordToCells, transformRow } from "../mapping";

import type { ImportField, ImportSpec } from "@/types/content-import";

const FIELDS: ImportField[] = [
  { key: "name", labelKey: "contentImport.fields.units.name", aliases: ["назва", "name"], type: "string", required: true },
  { key: "maxHp", labelKey: "contentImport.fields.units.maxHp", aliases: ["хп", "hp", "хіти"], type: "int" },
  { key: "abilities", labelKey: "contentImport.fields.units.abilities", aliases: ["навички/здібності", "особливості"], type: "abilitiesText" },
  { key: "raceId", labelKey: "contentImport.fields.units.raceId", aliases: ["раса", "група"], type: "ref", ref: "races" },
];

const SPEC: ImportSpec = { kind: "units", fields: FIELDS };

describe("autoMap", () => {
  it("ключ, підпис і синоніми без регістру й пробілів; невідомі — null", () => {
    expect(autoMap(["NAME", " хп ", "Хіти", "Група", "Зайве"], FIELDS)).toEqual({ NAME: "name", " хп ": "maxHp", Хіти: "maxHp", Група: "raceId", Зайве: null });
  });
});

describe("applyMapping", () => {
  it("кілька колонок здібностей з'єднуються через «. », як у старому імпорті", () => {
    const row = { Назва: "Біс", "Навички/Здібності": "А: перша", Особливості: "Б" };

    expect(applyMapping(row, autoMap(Object.keys(row), FIELDS), FIELDS).value).toEqual({ name: "Біс", abilities: "А: перша. Б" });
  });

  it("для інших полів — перша непорожня колонка й попередження", () => {
    const row = { hp: "", ХП: "7", Хіти: "9" };

    const { value, issues } = applyMapping(row, autoMap(Object.keys(row), FIELDS), FIELDS);

    expect(value).toEqual({ maxHp: "7" });
    expect(issues).toEqual([{ field: "maxHp", level: "warning", message: "contentImport.issues.duplicateColumns", params: { field: "contentImport.fields.units.maxHp" } }]);
  });

  it("колонка з null у мапінгу ігнорується", () => {
    expect(applyMapping({ Назва: "А", ХП: "5" }, { Назва: "name", ХП: null }, FIELDS).value).toEqual({ name: "А" });
  });
});

describe("coerceRecord / transformRow", () => {
  it("перетворює значення, невідомі ключі — попередження, погані значення — помилка поля", () => {
    const { value, issues } = coerceRecord({ name: " Біс ", maxHp: "18 (4к6)", extra: 1, raceId: "Гноми" }, FIELDS);

    expect(value).toEqual({ name: "Біс", maxHp: 18, raceId: "Гноми" });
    expect(issues).toEqual([{ field: "extra", level: "warning", message: "contentImport.issues.unknownField", params: { field: "extra" } }]);
    expect(coerceRecord({ maxHp: "багато" }, FIELDS).issues[0]).toEqual({ field: "maxHp", level: "warning", message: "contentImport.issues.columnSkipped", params: { got: "багато", field: "contentImport.fields.units.maxHp", detail: "contentImport.details.integerExpectedGot", value: "багато" } });
    expect(coerceRecord({ name: "" }, FIELDS).issues).toEqual([]);
  });

  it("ідемпотентна: повторне перетворення не змінює значення", () => {
    const once = transformRow({ Назва: "Біс", ХП: "18", Особливості: "Втеча: геть" }, { Назва: "name", ХП: "maxHp", Особливості: "abilities" }, FIELDS).value;

    expect(coerceRecord(once, FIELDS)).toEqual({ value: once, issues: [] });
  });
});

describe("recordToCells / missingRequired / nameKey", () => {
  it("клітинки в порядку полів, посилання — назвою", () => {
    expect(recordToCells(SPEC, { name: "Біс", maxHp: 18, raceId: "r1" }, (_k, id) => (id === "r1" ? "Гноми" : undefined))).toEqual(["Біс", "18", "", "Гноми"]);
  });

  it("незіставлені обов'язкові поля", () => {
    expect(missingRequired(FIELDS, { ХП: "maxHp" }).map((f) => f.key)).toEqual(["name"]);
    expect(missingRequired(FIELDS, { Назва: "name" })).toEqual([]);
  });

  it("nameKey", () => expect(nameKey("  Гноми ")).toBe(nameKey("гноми")));
});

describe("дублікати колонок", () => {
  const LIST: ImportField[] = [...FIELDS, { key: "immunities", labelKey: "contentImport.fields.units.immunities", aliases: ["імунітети", "imm"], type: "list" }];

  it("list-колонки з'єднуються, список розбирається", () => {
    const { value } = transformRow({ Імунітети: "fire", imm: "cold" }, { Імунітети: "immunities", imm: "immunities" }, LIST);

    expect(value).toEqual({ immunities: ["fire", "cold"] });
  });

  it("duplicateTargets: лише поля, що не з'єднуються", () => {
    const mapping = { a: "maxHp", b: "maxHp", c: "abilities", d: "abilities", e: "immunities", f: "immunities", g: "name" };

    expect(duplicateTargets(LIST, mapping).map((f) => f.key)).toEqual(["maxHp"]);
  });
});

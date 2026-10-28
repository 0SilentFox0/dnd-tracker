import { describe, expect, it } from "vitest";

import { formatFieldValue, joinList, normalizeHeader, parseFieldValue, splitList } from "../values";

import type { ImportField } from "@/types/content-import";

const f = (type: ImportField["type"], extra: Partial<ImportField> = {}): ImportField => ({ key: "k", label: "Поле", aliases: [], type, examples: ["", ""], ...extra });

const ENUM = f("enum", { enumValues: ["action", "bonusAction"], enumLabels: { action: ["Дія"], bonusAction: ["Бонусна дія"] } });

const NAMES: Record<string, string> = { "races:r1": "Гноми", "spells:s1": "Вогонь, сильний", "spells:s2": "Лід" };

const names = (kind: string, id: string) => NAMES[`${kind}:${id}`];

describe("parseFieldValue", () => {
  it("порожнє — без значення й без помилки для будь-якого типу", () => {
    for (const type of ["string", "int", "bool", "enum", "json", "cr", "attacks"] as const) expect(parseFieldValue(f(type), "  ")).toEqual({});
    expect(parseFieldValue(f("int"), undefined)).toEqual({});
  });

  it("int — перше ціле в рядку, число обрізається, без цифр — помилка", () => {
    expect(parseFieldValue(f("int"), "18 (4к6 + 4)")).toEqual({ value: 18 });
    expect(parseFieldValue(f("int"), "8 (+1)")).toEqual({ value: 8 });
    expect(parseFieldValue(f("int"), "Walk=30")).toEqual({ value: 30 });
    expect(parseFieldValue(f("int"), -2)).toEqual({ value: -2 });
    expect(parseFieldValue(f("int"), 7.9)).toEqual({ value: 7 });
    expect(parseFieldValue(f("int"), "багато").issue).toContain("Очікується ціле число");
  });

  it("number — кома як крапка", () => {
    expect(parseFieldValue(f("number"), "0,25")).toEqual({ value: 0.25 });
  });

  it("bool — українські й англійські варіанти", () => {
    expect(parseFieldValue(f("bool"), "Так")).toEqual({ value: true });
    expect(parseFieldValue(f("bool"), "no")).toEqual({ value: false });
    expect(parseFieldValue(f("bool"), true)).toEqual({ value: true });
    expect(parseFieldValue(f("bool"), "можливо").issue).toContain("так/ні");
  });

  it("enum — значення або підпис без регістру; невідоме — помилка з переліком підписів", () => {
    expect(parseFieldValue(ENUM, "бонусна ДІЯ")).toEqual({ value: "bonusAction" });
    expect(parseFieldValue(ENUM, "action")).toEqual({ value: "action" });
    expect(parseFieldValue(ENUM, "реакція").issue).toBe("Невідоме значення «реакція»; можливі: Дія, Бонусна дія");
  });

  it("list — роздільники | ; , і масив; enum-список перевіряє кожен елемент", () => {
    expect(parseFieldValue(f("list"), "a | b, c")).toEqual({ value: ["a", "b, c"] });
    expect(parseFieldValue(f("list"), "a; b")).toEqual({ value: ["a", "b"] });
    expect(parseFieldValue(f("refList"), "a, b")).toEqual({ value: ["a", "b"] });
    expect(parseFieldValue(f("list"), [" a ", ""])).toEqual({ value: ["a"] });
    expect(parseFieldValue({ ...ENUM, type: "list" }, "Дія, bonusAction")).toEqual({ value: ["action", "bonusAction"] });
    expect(parseFieldValue({ ...ENUM, type: "list" }, "Дія, політ").issue).toContain("Невідомі значення: політ");
  });

  it("dice — к/k/пробіли, ціле → число", () => {
    expect(parseFieldValue(f("dice"), "2 к6 + 1")).toEqual({ value: "2d6+1" });
    expect(parseFieldValue(f("dice"), "8D6")).toEqual({ value: "8d6" });
    expect(parseFieldValue(f("dice"), "3")).toEqual({ value: 3 });
    expect(parseFieldValue(f("dice"), 4)).toEqual({ value: 4 });
    expect(parseFieldValue(f("dice"), "2d8 + STR").issue).toContain("2d6+1");
  });

  it("cr — дроби, кома, ціле; не з таблиці — помилка", () => {
    expect(parseFieldValue(f("cr"), "1/8")).toEqual({ value: 0.125 });
    expect(parseFieldValue(f("cr"), "0,5")).toEqual({ value: 0.5 });
    expect(parseFieldValue(f("cr"), "5")).toEqual({ value: 5 });
    expect(parseFieldValue(f("cr"), 0.25)).toEqual({ value: 0.25 });
    expect(parseFieldValue(f("cr"), "1/3").issue).toContain("CR");
  });

  it("json — рядок парситься, об'єкт проходить, зламаний — помилка", () => {
    expect(parseFieldValue(f("json"), '{"kind":"auto"}')).toEqual({ value: { kind: "auto" } });
    expect(parseFieldValue(f("json"), { kind: "auto" })).toEqual({ value: { kind: "auto" } });
    expect(parseFieldValue(f("json"), "{kind").issue).toBe("Некоректний JSON у клітинці");
  });

  it("attacks — текстова мова юнітів або JSON", () => {
    expect(parseFieldValue(f("attacks"), "Укус +5, 1к6 колючий")).toEqual({ value: [{ name: "Укус", attackBonus: 5, damageType: "piercing", damageDice: "1d6" }] });
    expect(parseFieldValue(f("attacks"), "Відсутні")).toEqual({ value: [] });
    expect(parseFieldValue(f("attacks"), '[{"name":"Лук"}]')).toEqual({ value: [{ name: "Лук" }] });
  });

  it("abilitiesText — текст стає вміннями-нотатками, JSON-масив — як є", () => {
    const { value } = parseFieldValue(f("abilitiesText"), "Втеча: відходить бонусною дією");

    expect(value).toEqual([{ id: "sa0", name: "Втеча", description: "відходить бонусною дією", trigger: { event: "passive" }, effects: [{ kind: "note", text: "відходить бонусною дією" }] }]);
    expect(parseFieldValue(f("abilitiesText"), "[]")).toEqual({ value: [] });
  });
});

describe("formatFieldValue ↔ parseFieldValue", () => {
  it("посилання — назви; список з комою в назві — через « | » і читається назад", () => {
    const refList = f("refList", { ref: "spells" });

    const cell = formatFieldValue(refList, ["s1", "s2"], names);

    expect(cell).toBe("Вогонь, сильний | Лід");
    expect(parseFieldValue(refList, cell)).toEqual({ value: ["Вогонь, сильний", "Лід"] });
    expect(formatFieldValue(f("ref", { ref: "races" }), "r1", names)).toBe("Гноми");
    expect(formatFieldValue(f("ref", { ref: "races" }), "r9", names)).toBe("r9");
  });

  it("cr, bool, json і порожні значення", () => {
    expect(formatFieldValue(f("cr"), 0.25, names)).toBe("0.25");
    expect(formatFieldValue(f("bool"), false, names)).toBe("ні");
    expect(formatFieldValue(f("json"), { kind: "auto" }, names)).toBe('{"kind":"auto"}');
    expect(formatFieldValue(f("abilitiesText"), [], names)).toBe("");
    expect(formatFieldValue(f("int"), null, names)).toBe("");
  });
});

describe("helpers", () => {
  it("normalizeHeader знімає BOM, регістр і зайві пробіли", () => expect(normalizeHeader("﻿  Клас   Броні ")).toBe("клас броні"));
  it("splitList / joinList", () => {
    expect(splitList("a|b;c")).toEqual(["a", "b;c"]);
    expect(joinList(["a", "b"])).toBe("a, b");
    expect(joinList(["a, b", "c"])).toBe("a, b | c");
  });
});

describe("attacks — формат Name_dice", () => {
  it("academy.csv: дві атаки через |", () => {
    expect(parseFieldValue(f("attacks"), "PishchalRanged_1d12+2|PishchalMelee_1d4+1")).toEqual({
      value: [
        { name: "PishchalRanged", type: "ranged", attackBonus: 0, damageType: "bludgeoning", damageDice: "1d12+2" },
        { name: "PishchalMelee", type: "melee", attackBonus: 0, damageType: "bludgeoning", damageDice: "1d4+1" },
      ],
    });
  });

  it("пробіл замість _, роздільники ; і новий рядок", () => {
    const r = parseFieldValue(f("attacks"), "Longbow 1d8;Club 1d4\nSling_1d4");

    expect((r.value as { name: string; type: string }[]).map((a) => [a.name, a.type])).toEqual([["Longbow", "ranged"], ["Club", "melee"], ["Sling", "melee"]]);
  });

  it("нерозпізнана частина — попередження, решта лишається", () => {
    const r = parseFieldValue(f("attacks"), "Bite_1d6|щось дивне");

    expect((r.value as unknown[]).length).toBe(1);
    expect(r.warning).toBe("Не розпізнано атаку: «щось дивне»");
  });
});

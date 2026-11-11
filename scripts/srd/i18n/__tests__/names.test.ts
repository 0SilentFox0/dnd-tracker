import { describe, expect, it } from "vitest";

import { buildNameMap, fixItalicNames, namesIn } from "../names";

import type { KeyedString } from "@/lib/utils/templates/i18n/keys";

const n = (key: string, en: string): KeyedString => ({ key, kind: "spells", slug: key, fieldPath: "name", cls: "n", en });

const tr = (entries: Record<string, [string, string]>) => Object.fromEntries(Object.entries(entries).map(([key, [text, en]]) => [key, { text, en }]));

const names = buildNameMap([n("e", "force"), n("a", "Fireball"), n("b", "Cure Wounds"), n("c", "Light"), n("d", "Kobold")], tr({ e: ["силова", "force"], a: ["Вогняна куля", "Fireball"], b: ["Зцілення ран", "Cure Wounds"], c: ["Світло", "Light"], d: ["Кобольд", "Kobold"] }));

describe("buildNameMap", () => {
  it("бере лише перекладені назви", () => {
    expect(buildNameMap([n("a", "Fireball"), n("z", "Missing")], tr({ a: ["Вогняна куля", "Fireball"] }))).toEqual(new Map([["Fireball", "Вогняна куля"]]));
  });
});

describe("namesIn", () => {
  it("повертає лише назви, що зустрічаються цілим словом, довші за найкоротші першими", () => {
    expect(namesIn(["Cast *Fireball* or Cure Wounds.", "The Kobolds flee"], names)).toEqual({ Fireball: "Вогняна куля", "Cure Wounds": "Зцілення ран" });
    expect(namesIn(["Lightning", "a force"], names)).toEqual({});
  });
});

describe("fixItalicNames", () => {
  it("підміняє курсивні назви (* та _) за порядком, не чіпає жирний і чужі курсиви", () => {
    const en = "Cast *Fireball*, _Cure Wounds_ and **Bold** with *Flair*.";

    expect(fixItalicNames(en, "Накладіть *Вогняну кулю*, _Лікування_ та **Жирне** з *Шиком*.", names)).toBe("Накладіть *Вогняна куля*, _Зцілення ран_ та **Жирне** з *Шиком*.");
  });

  it("не чіпає переклад, коли кількість курсивів розійшлася", () => {
    expect(fixItalicNames("Cast *Fireball* and *Light*", "Накладіть *Вогняну кулю* і Світло", names)).toBe("Накладіть *Вогняну кулю* і Світло");
  });
});

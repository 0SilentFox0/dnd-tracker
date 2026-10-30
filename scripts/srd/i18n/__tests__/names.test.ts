import { describe, expect, it } from "vitest";

import type { CatalogEntry } from "../catalog";
import { buildNameMap, fixItalicNames, namesIn } from "../names";

const n = (hash: string, en: string): CatalogEntry => ({ hash, cls: "n", en, kinds: ["spells"] });

const names = buildNameMap([n("e", "force"), n("a", "Fireball"), n("b", "Cure Wounds"), n("c", "Light"), n("d", "Kobold")], { e: "силова", a: "Вогняна куля", b: "Зцілення ран", c: "Світло", d: "Кобольд" });

describe("buildNameMap", () => {
  it("бере лише перекладені назви", () => {
    expect(buildNameMap([n("a", "Fireball"), n("z", "Missing")], { a: "Вогняна куля" })).toEqual(new Map([["Fireball", "Вогняна куля"]]));
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

import { describe, expect, it } from "vitest";

import { parseDamageBreakdown } from "@/lib/utils/battle/view/damage-breakdown";

describe("parseDamageBreakdown", () => {
  it("атака з бонусами й архетипом — рядки таблиці", () => {
    const text =
      "Сума кубиків: 7; + бонус 2 (Спритність); + 5 (рівень); = 14 (база); Бонус зі скілів: +15% (Відплата); Расовий бонус: +20% (Стиль бою); Бонус ефекту: +10% (Сурми світанку); Бонус дії: +15% (Ця дія); ──────────; Сума 22.0 = 22 шкоди; ──────────; × 1.5 (архетип: Лучник) = 33";

    expect(parseDamageBreakdown(text)).toEqual([
      { label: "Кубики", value: "7", tone: "step" },
      { label: "Спритність", value: "+2", tone: "step" },
      { label: "Рівень", value: "+5", tone: "step" },
      { label: "База", value: "14", tone: "total" },
      { label: "Відплата", source: "Бонус зі скілів", value: "+15%", tone: "step" },
      { label: "Стиль бою", source: "Расовий бонус", value: "+20%", tone: "step" },
      { label: "Сурми світанку", source: "Бонус ефекту", value: "+10%", tone: "step" },
      { label: "Ця дія", source: "Бонус дії", value: "+15%", tone: "step" },
      { label: "", tone: "rule" },
      { label: "Сума", value: "22", tone: "total" },
      { label: "", tone: "rule" },
      { label: "Архетип: Лучник", value: "×1.5 → 33", tone: "total" },
    ]);
  });

  it("від'ємний бонус, flat, крит, рівний бій", () => {
    expect(parseDamageBreakdown("+ бонус -1 (Сила); Flat бонус зі скілів: -2 (Втома); × 2 (крит) = 18 урону; × 0.95 (рівний бій) = 17")).toEqual([
      { label: "Сила", value: "-1", tone: "step" },
      { label: "Втома", source: "Бонус зі скілів", value: "-2", tone: "step" },
      { label: "Крит", value: "×2 → 18", tone: "total" },
      { label: "Рівний бій", value: "×0.95 → 17", tone: "total" },
    ]);
  });

  it("заклинання: бонуси з назвою; невідомий формат — текстом", () => {
    expect(parseDamageBreakdown("+ сума кубиків (15); + бонус Вогняна магія (+3); + бонус Чародійство: 20% від 15 (+3); 3d6: 4, 5, 6")).toEqual([
      { label: "Кубики", value: "15", tone: "step" },
      { label: "Вогняна магія", value: "+3", tone: "step" },
      { label: "Чародійство", value: "+20% (+3)", tone: "step" },
      { label: "3d6: 4, 5, 6", tone: "note" },
    ]);
  });

  it("плаский бонус зброї з проміжною сумою", () => {
    expect(parseDamageBreakdown("+ 2 (бонус зброї) = 16; − 1 (бонус зброї) = 15")).toEqual([
      { label: "Бонус зброї", value: "+2 → 16", tone: "total" },
      { label: "Бонус зброї", value: "−1 → 15", tone: "total" },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { parseGoals } from "@/lib/schemas/character-goals";
import { mergeDmGoals, mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

const dm: CharacterGoal = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const mine: CharacterGoal = { id: "p1", text: "Повернути лук", status: "active", author: "player" };

describe("goals", () => {
  it("parseGoals: невалідний JSON → []", () => {
    expect(parseGoals(null)).toEqual([]);
    expect(parseGoals([{ id: "x" }])).toEqual([]);
    expect(parseGoals([dm])).toEqual([dm]);
  });

  it("гравець не може змінити, видалити чи підробити ціль ДМа", () => {
    const out = mergePlayerGoals([dm, mine], [
      { id: "d1", text: "Зламано", status: "done" },
      { id: "p1", text: "Повернути лук батька", status: "done" },
      { id: "p2", text: "Нова", status: "active" },
    ]);

    expect(out).toEqual([
      dm,
      { id: "p1", text: "Повернути лук батька", status: "done", author: "player" },
      { id: "p2", text: "Нова", status: "active", author: "player" },
    ]);
  });

  it("гравець видаляє свою ціль, ціль ДМа лишається навіть якщо її немає у запиті", () => {
    expect(mergePlayerGoals([dm, mine], [])).toEqual([dm]);
  });

  it("не більше 30 цілей разом", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, text: "x", status: "active" as const }));

    expect(mergePlayerGoals([dm], many)).toHaveLength(30);
  });
});

describe("goal ids are unique", () => {
  it("гравець: повторні id лишаються один раз", () => {
    const out = mergePlayerGoals([], [
      { id: "p1", text: "Перша", status: "active" },
      { id: "p1", text: "Дубль", status: "done" },
    ]);

    expect(out).toEqual([{ id: "p1", text: "Перша", status: "active", author: "player" }]);
  });

  it("ДМ: повторні id лишаються один раз", () => {
    const out = mergeDmGoals([], [
      { id: "d1", text: "Перша", status: "active" },
      { id: "d1", text: "Дубль", status: "active" },
    ]);

    expect(out.map((g) => g.text)).toEqual(["Перша"]);
  });
});

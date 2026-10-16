import { describe, expect, it } from "vitest";

import { groupLogByRound, logEntryView } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const entry = (resultText: string, hpChanges: BattleAction["hpChanges"] = []) => ({ resultText, hpChanges }) as BattleAction;

describe("logEntryView", () => {
  it("заголовок і підрядки з « | », шкода й лікування як дельти HP", () => {
    const v = logEntryView(entry("Раїлаг застосовує Вогняна куля (шкода: 14) | 🎲 Кошмар #1: рятівний кидок 5 проти СК 15 — провал", [
      { participantId: "n", participantName: "Кошмар #1", oldHp: 127, newHp: 120, change: 7 },
      { participantId: "a", participantName: "Айвен", oldHp: 100, newHp: 110, change: -10 },
    ]));

    expect(v.headline).toBe("Раїлаг застосовує Вогняна куля (шкода: 14)");
    expect(v.lines).toEqual(["🎲 Кошмар #1: рятівний кидок 5 проти СК 15 — провал"]);
    expect(v.hp).toEqual([{ id: "n", name: "Кошмар #1", delta: -7 }, { id: "a", name: "Айвен", delta: 10 }]);
  });

  it("системні тригери — кожен окремим рядком", () => {
    const v = logEntryView(entry("Тригери початку раунду 7: 💚 Сила життя (Айвен): Аграїл +5 HP; 🛡 Клятва щита: Аграїл"));

    expect(v.headline).toBe("Тригери початку раунду 7");
    expect(v.lines).toEqual(["💚 Сила життя (Айвен): Аграїл +5 HP", "🛡 Клятва щита: Аграїл"]);
  });

  it("мітка дії, ознака тригера й відсутність деталей", () => {
    const attack = logEntryView({ ...entry("Гоблін б'є"), actionType: "attack" } as BattleAction);

    expect(attack.kindLabel).toBe("атака");
    expect(attack.isTrigger).toBe(false);
    expect(logEntryView(entry("Тригери початку раунду 2: a")).isTrigger).toBe(true);
  });
});

describe("groupLogByRound", () => {
  const at = (round: number, actionIndex: number) => ({ round, actionIndex }) as BattleAction;

  it("групує послідовні записи раунду зі збереженням порядку", () => {
    const groups = groupLogByRound([at(3, 9), at(3, 8), at(2, 7), at(1, 2), at(1, 1)]);

    expect(groups.map((g) => [g.round, g.entries.length])).toEqual([[3, 2], [2, 1], [1, 2]]);
    expect(groups[0].entries.map((e) => e.actionIndex)).toEqual([9, 8]);
  });

  it("порожній журнал — без груп", () => {
    expect(groupLogByRound([])).toEqual([]);
  });
});

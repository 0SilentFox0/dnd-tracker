import { describe, expect, it } from "vitest";

import { retaliationOutcome } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const ret = (actionIndex: number, change: number) =>
  ({
    actionIndex, actionType: "retaliation", actorName: "Гоблін",
    targets: [{ participantId: "me", participantName: "Фрейда" }],
    hpChanges: change ? [{ participantId: "me", participantName: "Фрейда", oldHp: 20, newHp: 20 - change, change }] : [],
  }) as unknown as BattleAction;

describe("retaliationOutcome", () => {
  it("нова подія відсічі → імʼя і шкода по атакувальнику; стара або відсутня — нічого", () => {
    expect(retaliationOutcome([ret(4, 3), ret(9, 4)], new Set([4]))).toEqual({ name: "Гоблін", damage: 4 });
    expect(retaliationOutcome([ret(9, 0)], new Set())).toEqual({ name: "Гоблін", damage: 0 });
    expect(retaliationOutcome([ret(4, 3)], new Set([4]))).toBeUndefined();
  });
});

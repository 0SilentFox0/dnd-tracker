import { describe, expect, it } from "vitest";

import { diceThrowOf } from "@/lib/utils/battle/fx/dice";
import type { BattleAction } from "@/types/battle";

const action = (over: Partial<BattleAction> & { actionDetails: BattleAction["actionDetails"] }): BattleAction =>
  ({ id: "e1", battleId: "b", round: 1, actionIndex: 7, timestamp: new Date(0), actorId: "a", actorName: "Айвен", actorSide: "ally", actionType: "attack", targets: [{ participantId: "t", participantName: "Біс #13" }], resultText: "", hpChanges: [], isCancelled: false, ...over }) as BattleAction;

describe("diceThrowOf", () => {
  it("атака з перевагою: ряд d20 (обраний/відкинутий), ряд шкоди, підпис, зерно з actionIndex", () => {
    const spec = diceThrowOf(action({ actionDetails: { diceRolls: [
      { kind: "attack", rollerId: "a", targetId: "t", dice: [{ sides: 20, value: 4 }, { sides: 20, value: 18, chosen: true }] },
      { kind: "damage", rollerId: "a", targetId: "t", dice: [{ sides: 8, value: 5 }] },
    ] } }));

    expect(spec).toEqual({
      seed: 7,
      groups: [[{ sides: 20, value: 4, dropped: true }, { sides: 20, value: 18, chosen: true }], [{ sides: 8, value: 5 }]],
      caption: "Айвен · атака → Біс #13",
      extraSaves: 0,
    });
  });

  it("рятунки понад 6 — у extraSaves; підпис заклинання", () => {
    const saves = Array.from({ length: 8 }, (_, i) => ({ kind: "save" as const, rollerId: `x${i}`, dice: [{ sides: 20 as const, value: i + 1 }] }));

    const spec = diceThrowOf(action({ actionType: "spell", targets: [], actionDetails: { spellName: "Вогняна куля", diceRolls: [{ kind: "damage", rollerId: "a", dice: [{ sides: 6, value: 3 }] }, ...saves] } }));

    expect(spec?.groups.map((g) => g.length)).toEqual([1, 6]);
    expect(spec?.extraSaves).toBe(2);
    expect(spec?.caption).toBe("Айвен · Вогняна куля");
  });

  it("мораль; без diceRolls, скасована або порожня — null", () => {
    expect(diceThrowOf(action({ actionType: "ability", targets: [], actionDetails: { diceRolls: [{ kind: "morale", rollerId: "a", dice: [{ sides: 10, value: 9 }] }] } }))?.caption).toBe("Айвен · мораль");
    expect(diceThrowOf(action({ actionDetails: {} }))).toBeNull();
    expect(diceThrowOf(action({ isCancelled: true, actionDetails: { diceRolls: [{ kind: "morale", rollerId: "a", dice: [{ sides: 10, value: 1 }] }] } }))).toBeNull();
    expect(diceThrowOf(action({ actionDetails: { diceRolls: [] } }))).toBeNull();
  });

  it("підпис бере ім'я цілі як є (маскування вже в журналі)", () => {
    const spec = diceThrowOf(action({ targets: [{ participantId: "t", participantName: "невідомий" }], actionDetails: { diceRolls: [{ kind: "attack", rollerId: "a", dice: [{ sides: 20, value: 10 }] }] } }));

    expect(spec?.caption).toContain("невідомий");
  });
});

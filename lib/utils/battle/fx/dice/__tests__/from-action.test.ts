import { describe, expect, it } from "vitest";

import { diceThrowsOf } from "@/lib/utils/battle/fx/dice";
import type { BattleAction } from "@/types/battle";

const action = (over: Partial<BattleAction> & { actionDetails: BattleAction["actionDetails"] }): BattleAction =>
  ({ id: "e1", battleId: "b", round: 1, actionIndex: 7, timestamp: new Date(0), actorId: "a", actorName: "Айвен", actorSide: "ally", actionType: "attack", targets: [{ participantId: "t", participantName: "Біс #13" }], resultText: "", hpChanges: [], isCancelled: false, ...over }) as BattleAction;

describe("diceThrowsOf", () => {
  it("атака з перевагою: спершу кидок влучання (обраний/відкинутий d20), потім окремо шкода", () => {
    const specs = diceThrowsOf(action({ actionDetails: { diceRolls: [
      { kind: "damage", rollerId: "a", targetId: "t", dice: [{ sides: 8, value: 5 }] },
      { kind: "attack", rollerId: "a", targetId: "t", dice: [{ sides: 20, value: 4 }, { sides: 20, value: 18, chosen: true }] },
    ] } }));

    expect(specs).toEqual([
      { seed: 35, groups: [[{ sides: 20, value: 4, dropped: true }, { sides: 20, value: 18, chosen: true }]] },
      { seed: 37, groups: [[{ sides: 8, value: 5 }]] },
    ]);
  });

  it("заклинання: спершу рятунки (не більше 6), потім шкода", () => {
    const saves = Array.from({ length: 8 }, (_, i) => ({ kind: "save" as const, rollerId: `x${i}`, dice: [{ sides: 20 as const, value: i + 1 }] }));

    const [save, damage] = diceThrowsOf(action({ actionType: "spell", targets: [], actionDetails: { spellName: "Вогняна куля", diceRolls: [{ kind: "damage", rollerId: "a", dice: [{ sides: 6, value: 3 }] }, ...saves] } }));

    expect(save.groups.map((g) => g.length)).toEqual([6]);
    expect(damage.groups).toEqual([[{ sides: 6, value: 3 }]]);
  });

  it("мораль; без diceRolls, скасована або порожня — нічого", () => {
    expect(diceThrowsOf(action({ actionType: "ability", targets: [], actionDetails: { diceRolls: [{ kind: "morale", rollerId: "a", dice: [{ sides: 10, value: 9 }] }] } }))[0].groups).toEqual([[{ sides: 10, value: 9 }]]);
    expect(diceThrowsOf(action({ actionDetails: {} }))).toEqual([]);
    expect(diceThrowsOf(action({ isCancelled: true, actionDetails: { diceRolls: [{ kind: "morale", rollerId: "a", dice: [{ sides: 10, value: 1 }] }] } }))).toEqual([]);
    expect(diceThrowsOf(action({ actionDetails: { diceRolls: [] } }))).toEqual([]);
  });

});

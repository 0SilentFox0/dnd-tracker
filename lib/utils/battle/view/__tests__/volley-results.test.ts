import { describe, expect, it } from "vitest";

import { volleyResults } from "../volley-results";

import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAction } from "@/types/battle";

interface Over {
  target: string;
  hit?: boolean;
  crit?: boolean;
  hp?: [string, number][];
  actorId?: string;
  actionType?: BattleAction["actionType"];
}

const action = (i: number, over: Over): BattleAction =>
  ({
    id: `x${i}`, battleId: "b", round: 1, actionIndex: i, timestamp: new Date(), actorId: over.actorId ?? "a", actorName: "A", actorSide: "ally",
    actionType: over.actionType ?? "attack", targets: [{ participantId: over.target, participantName: over.target }],
    actionDetails: { isHit: over.hit ?? true, isCritical: over.crit ?? false },
    resultText: "", hpChanges: (over.hp ?? []).map(([participantId, change]) => ({ participantId, participantName: participantId, oldHp: 50, newHp: 50 - change, change })),
    isCancelled: false,
  }) as unknown as BattleAction;

describe("volleyResults", () => {
  const after = [placed("t", { hp: 10 }), placed("n", { hp: 10 }), placed("s", { hp: 10 })];

  it("рядок на кожен удар атакуючого, включно з автоцілями, у порядку журналу", () => {
    const log = [action(1, { target: "t", hp: [["t", 8]] }), action(2, { target: "n", hit: false })];

    expect(volleyResults(log, new Set(), "a", after)).toEqual([
      { kind: "hit", targetId: "t", damage: 8, downed: false },
      { kind: "miss", targetId: "n", damage: 0, downed: false },
    ]);
  });

  it("вторинна шкода (хвиля, стріла сили) — окремий рядок splash", () => {
    const log = [action(1, { target: "t", crit: true, hp: [["t", 8], ["s", 4]] })];

    expect(volleyResults(log, new Set(), "a", after)).toEqual([
      { kind: "crit", targetId: "t", damage: 8, downed: false },
      { kind: "hit", targetId: "s", damage: 4, downed: false, splash: true },
    ]);
  });

  it("пропускає старі дії, відповідний удар і чужі дії", () => {
    const log = [action(1, { target: "t" }), action(2, { target: "a", actorId: "t", actionType: "retaliation" }), action(3, { target: "n", hp: [["n", 3]] })];

    expect(volleyResults(log, new Set([1]), "a", after).map((r) => r.targetId)).toEqual(["n"]);
  });
});

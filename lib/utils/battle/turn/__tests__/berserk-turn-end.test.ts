import { describe, expect, it } from "vitest";

import { runBerserkTurn } from "../berserk";

import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";

const lastTurnEffect = makeEffect("adv", { duration: 1, expireAtTurnEnd: true });

describe("berserk turn end", () => {
  it("expires turn-end effects of the berserker like a normal turn end", () => {
    const p = makeParticipant({ id: "b" });

    const berserker = { ...p, battleData: { ...p.battleData, activeEffects: [lastTurnEffect] } };

    const r = runBerserkTurn({ participants: [berserker], restrictedBy: berserker, participantId: "b", bonusPercent: 50, round: 1, battleId: "x", actionIndex: 0, rng: seq(0.5) });

    expect(r.participants[0].battleData.activeEffects).toEqual([]);
  });
});

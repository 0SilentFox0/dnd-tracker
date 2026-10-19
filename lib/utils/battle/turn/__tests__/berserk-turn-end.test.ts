import { describe, expect, it } from "vitest";

import { runBerserkTurn } from "../berserk";

import { fireWave } from "@/data/library/unit-abilities";
import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";

const lastTurnEffect = makeEffect("adv", { duration: 1, expireAtTurnEnd: true, armed: true });

describe("berserk turn end", () => {
  it("expires turn-end effects of the berserker like a normal turn end", () => {
    const p = makeParticipant({ id: "b" });

    const berserker = { ...p, battleData: { ...p.battleData, activeEffects: [lastTurnEffect] } };

    const r = runBerserkTurn({ participants: [berserker], restrictedBy: berserker, participantId: "b", bonusPercent: 50, round: 1, battleId: "x", actionIndex: 0, rng: seq(0.5) });

    expect(r.participants[0].battleData.activeEffects).toEqual([]);
  });
});

describe("berserk with fire wave on a map", () => {
  const wave = resolved(fireWave());

  const at = (id: string, x: number, y: number, side: ParticipantSide, abilities: ReturnType<typeof resolved>[] = []) => placed(id, { side, at: { x, y }, hp: 300, abilities });

  it("burns only enemies in the cone behind the victim", () => {
    const berserker = at("b", 4, 5, ParticipantSide.ALLY, [wave]);

    const ps = [berserker, at("v", 5, 5, ParticipantSide.ENEMY), at("near", 6, 5, ParticipantSide.ENEMY), at("far", 5, 9, ParticipantSide.ENEMY)];

    const map = testMap();

    const r = runBerserkTurn({ participants: ps, restrictedBy: berserker, participantId: "b", bonusPercent: 0, round: 1, battleId: "x", actionIndex: 0, rng: seq(0, 0.95, 0.5), map });

    const hp = (id: string) => r.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

    expect(hp("v")).toBeLessThan(300);
    expect(hp("near")).toBeLessThan(300);
    expect(hp("far")).toBe(300);
  });
});

import { describe, expect, it } from "vitest";

import { endTurnCleanup, finishTurnEffects } from "../end-turn-cleanup";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { beginConcentration, dropConcentration } from "@/lib/utils/battle/concentration";
import type { ActiveEffect } from "@/types/battle";

const withEffects = (effects: ActiveEffect[]) => {
  const p = createMockParticipant();

  return { ...p, battleData: { ...p.battleData, activeEffects: effects } };
};

const ids = (effects: ActiveEffect[]) => effects.map((e) => e.id);

describe("endTurnCleanup", () => {
  it("cancels a long cast when concentration is lost or its action is skipped", () => {
    const base = createMockParticipant();

    const begun = beginConcentration([base], base.basicInfo.id, "cast1", "Prayer", 12).participants[0];

    const p = { ...begun, battleData: { ...begun.battleData, pendingCast: { spellId: "prayer", spellName: "Prayer", remainingRounds: 9, totalRounds: 10, lastRound: 1 } } };

    expect(dropConcentration([p], p.basicInfo.id, "damage").participants[0].battleData.pendingCast).toBeUndefined();

    const ended = finishTurnEffects(p, { participants: [p], rng: () => 0.5, round: 2 });

    expect(ended.participant.battleData.pendingCast).toBeUndefined();
    expect(ended.participant.battleData.activeEffects.some((e) => e.concentration)).toBe(false);
  });

  it("counts down only effects present since the turn start; applied this turn keep their duration", () => {
    const p = withEffects([makeEffect("old", { duration: 2, armed: true }), makeEffect("last", { duration: 1, armed: true }), makeEffect("fresh", { duration: 1 })]);

    const out = finishTurnEffects(p);

    expect(out.participant.battleData.activeEffects.map((e) => [e.id, e.duration, e.armed])).toEqual([
      ["old", 1, undefined],
      ["fresh", 1, undefined],
    ]);
    expect(out.expired).toEqual(["last"]);
  });

  it("expires turn-end effects after the owner's first full turn", () => {
    const p = withEffects([makeEffect("full", { expireAtTurnEnd: true, duration: 2, armed: true }), makeEffect("fresh", { expireAtTurnEnd: true, duration: 2 })]);

    expect(ids(endTurnCleanup(p).battleData.activeEffects)).toEqual(["fresh"]);
  });

  it("returns a charmed participant when the charm runs out", () => {
    const p = withEffects([makeEffect("charm", { duration: 1, armed: true, charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: "dm" } })]);

    expect(endTurnCleanup({ ...p, basicInfo: { ...p.basicInfo, side: ParticipantSide.ALLY } }).basicInfo).toMatchObject({ side: ParticipantSide.ENEMY, controlledBy: "dm" });
  });
});

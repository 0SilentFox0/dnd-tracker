import { describe, expect, it } from "vitest";

import { diffAppliedEffects } from "../applied-effects";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const effect = (id: string, type: ActiveEffect["type"]): ActiveEffect => ({ id, name: id, type, duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] });

const withEffects = (p: BattleParticipant, list: ActiveEffect[]): BattleParticipant => ({ ...p, battleData: { ...p.battleData, activeEffects: list } });

describe("diffAppliedEffects", () => {
  it("returns only new effects on the given targets", () => {
    const before = [withEffects(makeParticipant({ id: "a" }), [effect("old", "buff")]), makeParticipant({ id: "b" })];

    const after = [withEffects(makeParticipant({ id: "a" }), [effect("old", "buff"), effect("slow", "debuff")]), withEffects(makeParticipant({ id: "b" }), [effect("haste", "buff")])];

    expect(diffAppliedEffects(before, after, ["a"])).toEqual([{ id: "slow", name: "slow", duration: 2, type: "debuff", targetId: "a" }]);
  });

  it("ignores a target missing after the cast", () => {
    expect(diffAppliedEffects([makeParticipant({ id: "a" })], [], ["a"])).toEqual([]);
  });
});

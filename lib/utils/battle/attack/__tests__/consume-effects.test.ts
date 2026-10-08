import { describe, expect, it } from "vitest";

import { activeEffectIds, consumeAttackEffects } from "../consume-effects";

import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const withEffects = (id: string, effects: ActiveEffect[]): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id }, battleData: { ...p.battleData, activeEffects: effects } };
};

const ids = (p: BattleParticipant) => p.battleData.activeEffects.map((e) => e.id);

describe("consumeAttackEffects", () => {
  const a = withEffects("a", [makeEffect("adv", { consumeOn: "ownAttack" }), makeEffect("weak", { consumeOn: "ownHit" }), makeEffect("keep")]);

  const t = withEffects("t", [makeEffect("mark", { consumeOn: "attackAgainst" })]);

  it("consumes attacker ownAttack and target attackAgainst on a miss, keeps ownHit", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: false, existedBefore: activeEffectIds([a, t]) });

    expect(ids(ps[0])).toEqual(["weak", "keep"]);
    expect(ids(ps[1])).toEqual([]);
  });

  it("consumes ownHit on a hit", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: true, existedBefore: activeEffectIds([a, t]) });

    expect(ids(ps[0])).toEqual(["keep"]);
  });

  it("keeps effects applied during this attack", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: true, existedBefore: new Set(["a:keep"]) });

    expect(ids(ps[0])).toEqual(["adv", "weak", "keep"]);
  });
});

describe("existedBefore keys", () => {
  it("an effect id that exists on another participant does not make a new one count as old", () => {
    const attacker = withEffects("a", [makeEffect("shared", { consumeOn: "ownAttack" })]);

    const other = withEffects("t", [makeEffect("shared")]);

    const ps = consumeAttackEffects([attacker, other], { attackerId: "a", targetId: "t", hit: true, existedBefore: activeEffectIds([other]) });

    expect(ids(ps[0])).toEqual(["shared"]);
  });
});

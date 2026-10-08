import { describe, expect, it } from "vitest";

import { activeEffectIds, consumeAttackEffects, expireTurnEndEffects } from "../consume-effects";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const eff = (id: string, over: Partial<ActiveEffect> = {}): ActiveEffect =>
  ({ id, name: id, type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], ...over }) as ActiveEffect;

const withEffects = (id: string, effects: ActiveEffect[]): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id }, battleData: { ...p.battleData, activeEffects: effects } };
};

const ids = (p: BattleParticipant) => p.battleData.activeEffects.map((e) => e.id);

describe("consumeAttackEffects", () => {
  const a = withEffects("a", [eff("adv", { consumeOn: "ownAttack" }), eff("weak", { consumeOn: "ownHit" }), eff("keep")]);

  const t = withEffects("t", [eff("mark", { consumeOn: "attackAgainst" })]);

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
    const attacker = withEffects("a", [eff("shared", { consumeOn: "ownAttack" })]);

    const other = withEffects("t", [eff("shared")]);

    const ps = consumeAttackEffects([attacker, other], { attackerId: "a", targetId: "t", hit: true, existedBefore: activeEffectIds([other]) });

    expect(ids(ps[0])).toEqual(["shared"]);
  });
});

describe("expireTurnEndEffects", () => {
  it("drops turn-end effects only on their last turn", () => {
    const p = withEffects("a", [eff("fresh", { expireAtTurnEnd: true, duration: 2 }), eff("last", { expireAtTurnEnd: true, duration: 1 }), eff("plain", { duration: 1 })]);

    expect(ids(expireTurnEndEffects(p))).toEqual(["fresh", "plain"]);
  });
});

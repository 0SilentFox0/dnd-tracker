import { describe, expect, it } from "vitest";

import { endTurnCleanup, expireTurnEndEffects } from "../end-turn-cleanup";

import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect } from "@/types/battle";

const withEffects = (effects: ActiveEffect[]) => {
  const p = createMockParticipant();

  return { ...p, battleData: { ...p.battleData, activeEffects: effects } };
};

const ids = (effects: ActiveEffect[]) => effects.map((e) => e.id);

describe("expireTurnEndEffects", () => {
  it("drops turn-end effects only on their last turn", () => {
    const p = withEffects([makeEffect("fresh", { expireAtTurnEnd: true, duration: 2 }), makeEffect("last", { expireAtTurnEnd: true, duration: 1 }), makeEffect("plain", { duration: 1 })]);

    expect(ids(expireTurnEndEffects(p).battleData.activeEffects)).toEqual(["fresh", "plain"]);
  });
});

describe("endTurnCleanup", () => {
  it("expires turn-end effects", () => {
    const p = withEffects([makeEffect("last", { expireAtTurnEnd: true, duration: 1 }), makeEffect("plain")]);

    expect(ids(endTurnCleanup(p).battleData.activeEffects)).toEqual(["plain"]);
  });
});

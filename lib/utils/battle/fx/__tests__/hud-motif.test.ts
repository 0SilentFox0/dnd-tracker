import { describe, expect, it } from "vitest";

import { hudMotifsOf } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

const fx = (over: Partial<ActiveEffect>): ActiveEffect => ({ id: over.id ?? "e", name: "e", type: "debuff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], ...over });

describe("hudMotifsOf", () => {
  it("мотиви йдуть за аурами портрета", () => {
    expect(hudMotifsOf([fx({ dotDamage: { damagePerRound: 2, damageType: "fire" } })])).toEqual(["fire"]);
    expect(hudMotifsOf([fx({ dotDamage: { damagePerRound: 2, damageType: "bleed" } })])).toEqual(["blood"]);
    expect(hudMotifsOf([fx({ type: "buff", hotHeal: { healPerRound: 2 } } as Partial<ActiveEffect>)])).toEqual(["life"]);
  });

  it("однаковий мотив від двох аур не дублюється", () => {
    expect(hudMotifsOf([fx({ id: "a", fxElement: "cold" }), fx({ id: "b", dotDamage: { damagePerRound: 1, damageType: "cold" } })])).toEqual(["frost"]);
  });

  it("без ефектів — порожньо", () => {
    expect(hudMotifsOf([])).toEqual([]);
  });
});

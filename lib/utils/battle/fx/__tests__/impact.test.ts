import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { IMPACT_MS, impactFor } from "@/lib/utils/battle/fx";

describe("impactFor", () => {
  it("fire bolt target → fire damage after the bolt", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactFor(a, "t")).toEqual({ element: "fire", kind: "damage", delayMs: IMPACT_MS.bolt });
  });

  it("heal spell target → kind heal", () => {
    const a = action({ actionType: "spell", actionDetails: { spellEffectKinds: ["heal"] } });

    expect(impactFor(a, "t")).toMatchObject({ kind: "heal", delayMs: IMPACT_MS.heal });
  });

  it("miss → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: false } });

    expect(impactFor(a, "t")).toBeNull();
  });

  it("non-target and no action → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

    expect(impactFor(a, "x")).toBeNull();
    expect(impactFor(undefined, "t")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { IMPACT_MS, impactDelayFor } from "@/lib/utils/battle/fx";

describe("impactDelayFor", () => {
  it("target of a bolt waits for the bolt", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactDelayFor(a, "t")).toBe(IMPACT_MS.bolt);
  });

  it("non-target / no action → 0", () => {
    expect(impactDelayFor(undefined, "t")).toBe(0);
    expect(impactDelayFor(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } }), "x")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import { d20HitModel } from "../../rules/balance";

import { hitChance } from "@/lib/utils/battle/balance/hit-chance";

describe("d20HitModel", () => {
  it("hit chance is the d20 to-hit against AC", () => {
    expect(d20HitModel.winChance(5, 15)).toBe(hitChance(5, 15));
  });

  it("hero and unit references differ", () => {
    expect(d20HitModel.refHit).not.toBe(d20HitModel.refHitUnit);
  });
});

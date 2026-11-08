import { describe, expect, it } from "vitest";

import { tickAilments } from "../ailments";
import { FESTERING_FAIL_WOUNDS, FESTERING_RENEW_DAYS } from "../constants";
import type { Ailment } from "../types";

const rng = () => 0.5;

const a = (kind: Ailment["kind"], daysLeft: number, id = kind): Ailment => ({ id, kind, daysLeft, label: id });

describe("tickAilments", () => {
  it.each(["disease", "injury"] as const)("counts down %s and removes it on expiry", (kind) => {
    const kept = tickAilments([a(kind, 10)], 3, { endurance: 40, rng });

    expect(kept.ailments[0].daysLeft).toBe(7);
    expect(kept.report[0].expired).toBeUndefined();

    const done = tickAilments([a(kind, 10)], 10, { endurance: 40, rng });

    expect(done.ailments).toEqual([]);
    expect(done.report[0].expired).toBe(true);
  });

  it("clears festering on a passed test", () => {
    const r = tickAilments([a("festering", 1)], 1, { endurance: 40, rng, presetRolls: [10] });

    expect(r.ailments).toEqual([]);
    expect(r.report[0].test?.outcome).toBe("success");
    expect(r.wounds).toBe(0);
  });

  it("renews festering on a failed test", () => {
    const r = tickAilments([a("festering", 1)], 1, { endurance: 40, rng, presetRolls: [90] });

    expect(r.ailments[0].daysLeft).toBe(FESTERING_RENEW_DAYS);
    expect(r.wounds).toBe(FESTERING_FAIL_WOUNDS);
  });

  it("sums wounds of several failures", () => {
    const r = tickAilments([a("festering", 1, "f1"), a("festering", 1, "f2")], 1, { endurance: 40, rng, presetRolls: [90, 91] });

    expect(r.wounds).toBe(FESTERING_FAIL_WOUNDS * 2);
  });
});

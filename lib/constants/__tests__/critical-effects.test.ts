import { describe, expect, it } from "vitest";

import {
  critFlavor,
  CRITICAL_FAIL_EFFECTS,
  CRITICAL_SUCCESS_EFFECTS,
  type CriticalEffect,
  getCriticalEffect,
} from "@/lib/constants/critical-effects";

describe("critical effect flavor", () => {
  it("every effect has 3 phrases naming a participant", () => {
    for (const e of [...CRITICAL_SUCCESS_EFFECTS, ...CRITICAL_FAIL_EFFECTS]) {
      expect(e.flavor).toHaveLength(3);

      for (const f of e.flavor) {
        expect(f.includes("{attacker}") || f.includes("{target}")).toBe(true);
      }
    }
  });

  it("substitutes names and is deterministic for a seed", () => {
    const e = getCriticalEffect(6, "success") as CriticalEffect;

    const a = critFlavor(e, { attacker: "Семгрун", target: "Бес" }, "b1:2:x:y");

    expect(a).toBe(critFlavor(e, { attacker: "Семгрун", target: "Бес" }, "b1:2:x:y"));
    expect(a).toContain("Семгрун");
    expect(a).not.toContain("{");
  });

  it("replaces half damage with a slipping weapon", () => {
    expect(getCriticalEffect(5, "fail")).toMatchObject({
      name: "Зброя вислизає",
      effect: { type: "weakened_next_hit" },
    });
  });
});

import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { healthSegments, healthState, hpRatio } from "@/lib/utils/battle/view";

const at = (currentHp: number, maxHp = 40, status: "active" | "unconscious" | "dead" = "active") => {
  const p = createMockParticipant();

  return { ...p, combatStats: { ...p.combatStats, currentHp, maxHp, status } };
};

describe("healthState", () => {
  it.each([
    [40, "unhurt"], [39, "wounded"], [21, "wounded"], [20, "bloodied"], [11, "bloodied"], [10, "dying"], [1, "dying"], [0, "down"],
  ] as const)("%i/40 → %s", (hp, state) => {
    expect(healthState(at(hp))).toBe(state);
  });

  it("непритомний із HP > 0 — повалений", () => {
    expect(healthState(at(15, 40, "unconscious"))).toBe("down");
  });

  it("сегменти", () => {
    expect([healthSegments("unhurt"), healthSegments("bloodied"), healthSegments("down")]).toEqual([4, 2, 0]);
  });
});

describe("hpRatio", () => {
  it("частка в межах [0, 1]", () => {
    expect(hpRatio(at(10))).toBe(0.25);
    expect(hpRatio(at(50))).toBe(1);
    expect(hpRatio(at(-5))).toBe(0);
  });

  it("maxHp 0 → 0", () => {
    expect(hpRatio(at(5, 0))).toBe(0);
  });
});

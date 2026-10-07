import { describe, expect, it } from "vitest";

import { CombatStatus, type CombatStatusType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { isDown, isUp } from "@/lib/utils/battle/participant/state";

const withState = (status: CombatStatusType, currentHp: number) => {
  const p = createMockParticipant();

  return { ...p, combatStats: { ...p.combatStats, status, currentHp } };
};

describe("isUp / isDown", () => {
  it("активний з HP > 0 — на ногах", () => {
    expect(isUp(withState(CombatStatus.ACTIVE, 5))).toBe(true);
    expect(isDown(withState(CombatStatus.ACTIVE, 5))).toBe(false);
  });

  it("активний з 0 HP — впав", () => {
    expect(isUp(withState(CombatStatus.ACTIVE, 0))).toBe(false);
    expect(isDown(withState(CombatStatus.ACTIVE, 0))).toBe(true);
  });

  it.each([CombatStatus.UNCONSCIOUS, CombatStatus.DEAD])("%s — впав навіть з HP", (status) => {
    expect(isUp(withState(status, 10))).toBe(false);
    expect(isDown(withState(status, 10))).toBe(true);
  });
});

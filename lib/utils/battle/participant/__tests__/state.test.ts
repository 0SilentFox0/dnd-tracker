import { describe, expect, it } from "vitest";

import { CombatStatus, type CombatStatusType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { isDown, isUp, statusForHp } from "@/lib/utils/battle/participant/state";

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

describe("statusForHp", () => {
  it("kill — завжди мертвий", () => {
    expect(statusForHp(withState(CombatStatus.ACTIVE, 5), 0, true)).toBe(CombatStatus.DEAD);
  });

  it("0 HP: активний непритомніє, мертвий лишається мертвим", () => {
    expect(statusForHp(withState(CombatStatus.ACTIVE, 5), 0)).toBe(CombatStatus.UNCONSCIOUS);
    expect(statusForHp(withState(CombatStatus.DEAD, 0), 0)).toBe(CombatStatus.DEAD);
  });

  it("HP > 0 піднімає непритомного, мертвого не чіпає", () => {
    expect(statusForHp(withState(CombatStatus.UNCONSCIOUS, 0), 4)).toBe(CombatStatus.ACTIVE);
    expect(statusForHp(withState(CombatStatus.DEAD, 0), 4)).toBe(CombatStatus.DEAD);
  });
});

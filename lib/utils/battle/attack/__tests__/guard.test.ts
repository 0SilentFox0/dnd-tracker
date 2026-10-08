import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { splitGuardedDamage } from "@/lib/utils/battle/attack/process/guard";
import type { BattleParticipant } from "@/types/battle";

const guarded = (guardianId: string, percent = 50): BattleParticipant => {
  const p = makeParticipant({ id: "t" });

  return {
    ...p,
    battleData: {
      ...p.battleData,
      activeEffects: [
        {
          id: "g",
          name: "Щит",
          type: "buff",
          duration: 2,
          appliedAt: { round: 1, timestamp: new Date() },
          effects: [{ type: "guard", value: percent }],
          abilityKey: "guard",
          source: { participantId: guardianId, name: guardianId },
        },
      ],
    },
  };
};

describe("splitGuardedDamage", () => {
  it("no guard → all to target", () => {
    expect(splitGuardedDamage([makeParticipant({ id: "t" })], "t", 9)).toEqual({ targetDamage: 9, guardianId: null, guardianDamage: 0 });
  });

  it("50% guard sends floor(d/2) to the guardian", () => {
    expect(splitGuardedDamage([guarded("g"), makeParticipant({ id: "g" })], "t", 9)).toEqual({ targetDamage: 5, guardianId: "g", guardianDamage: 4 });
  });

  it("downed guardian → all to target", () => {
    const g = makeParticipant({ id: "g" });

    const down = { ...g, combatStats: { ...g.combatStats, status: "dead" } } as BattleParticipant;

    expect(splitGuardedDamage([guarded("g"), down], "t", 9).guardianId).toBeNull();
  });

  it("guardian === target → all to target", () => {
    expect(splitGuardedDamage([guarded("t")], "t", 9)).toEqual({ targetDamage: 9, guardianId: null, guardianDamage: 0 });
  });
});

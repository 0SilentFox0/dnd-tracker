import { describe, expect, it } from "vitest";

import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { applyPendingMoraleCheck } from "@/lib/utils/battle/turn/apply-pending-morale";

const p = createMockParticipant();

const payload = (shouldSkipTurn: boolean) => ({
  participantId: p.basicInfo.id,
  d10Roll: 10,
  moraleResult: { shouldSkipTurn, hasExtraTurn: false, message: "", moralePositive: false },
});

describe("applyPendingMoraleCheck", () => {
  it("паніка: до власного наступного ходу учасник не відповідає на удари", () => {
    expect(applyPendingMoraleCheck([p], payload(true), 1, "b1", 0, seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasUsedReaction).toBe(true);
    expect(applyPendingMoraleCheck([p], payload(false), 1, "b1", 0, seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasUsedReaction).toBe(false);
  });

  it("у лог іде ефективна мораль з тимчасовим бонусом", () => {
    const boosted = {
      ...p,
      combatStats: { ...p.combatStats, morale: 0 },
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "m", name: "Клич", type: "buff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat" as const, stat: "morale" as const, flat: 1 }] }],
      },
    };

    const { moraleLogEntry } = applyPendingMoraleCheck([boosted], payload(false), 1, "b1", 0, seq(0.5));

    expect(moraleLogEntry.actionDetails?.morale).toBe(1);
  });
});

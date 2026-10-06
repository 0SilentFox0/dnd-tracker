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
});

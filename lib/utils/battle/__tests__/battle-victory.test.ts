import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { completeBattle } from "@/lib/utils/battle/battle-victory";

describe("completeBattle", () => {
  it("перемога: hpChanges містять відроджених союзників", () => {
    const base = createMockParticipant();

    const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

    const { battleAction, updatedParticipants } = completeBattle([downed], "victory", 3);

    expect(updatedParticipants[0].combatStats.status).toBe("active");
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: downed.combatStats.maxHp })]);
  });
});

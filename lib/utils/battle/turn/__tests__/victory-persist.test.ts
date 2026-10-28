// lib/utils/battle/turn/__tests__/victory-persist.test.ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { completeBattle } from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const base = createMockParticipant();

const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

describe("completeBattle with persisted resources", () => {
  it("victory revives unconscious allies with 1 HP", () => {
    const rules = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true } };

    const { updatedParticipants, battleAction } = completeBattle([downed], "victory", 3, rules);

    expect(updatedParticipants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: 1 })]);
  });

  it("default rules keep max HP", () => {
    expect(completeBattle([downed], "victory", 3, DEFAULT_RULES).updatedParticipants[0].combatStats.currentHp).toBe(downed.combatStats.maxHp);
  });
});

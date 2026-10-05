import { describe, expect, it } from "vitest";

import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  participants: [
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } }),
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } }),
  ],
  pending: [],
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

describe("next-turn mutation", () => {
  it("передає хід і повертає події переходу", () => {
    const out = nextTurnMutation(ctx);

    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
    expect(Array.isArray(out.events)).toBe(true);
  });
});

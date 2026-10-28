import { describe, expect, it } from "vitest";

import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const base = createMockParticipant();

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null },
  participants: [
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } }),
    createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } }),
  ],
  pending: [],
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, critChoiceByDm: false, map: null, createdAt: new Date() },
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

describe("next-turn mutation", () => {
  it("передає хід і повертає події переходу", () => {
    const out = nextTurnMutation(ctx);

    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
    expect(Array.isArray(out.events)).toBe(true);
  });

  it("на новому раунді прибирає прострочені барʼєри з карти", () => {
    const map = { cols: 8, rows: 8, background: null, opacity: 0.3, terrain: { "1:1": { kind: "barrier" as const, untilRound: 1 } } };

    const out = nextTurnMutation({ ...ctx, scene: { ...ctx.scene, turnIndex: 1 }, meta: { ...ctx.meta, map } });

    expect(out.scene).toMatchObject({ round: 2, map: { cols: 8, rows: 8, background: null, opacity: 0.3 } });
    expect(out.scene?.map).not.toHaveProperty("terrain");
  });
});

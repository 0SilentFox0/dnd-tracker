import { describe, expect, it, vi } from "vitest";

import { createStartMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "prepared", round: 1, turnIndex: 0, version: 0, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [{ id: "u1", type: "unit", side: "enemy" }], friendlyFire: false, createdAt: new Date() },
  participants: [],
  pending: [],
  userId: "dm",
  isDM: true,
} as unknown as BattleMutationContext;

describe("start mutation", () => {
  it("будує учасників із лобі, ставить active, раунд 1, хід 0", async () => {
    const hero = createMockParticipant();

    const build = vi.fn(async () => ({ order: [hero], triggerLogEntries: [] }));

    const out = await createStartMutation(build)(ctx);

    expect(build).toHaveBeenCalledWith("b1", "c1", ctx.meta.setup);
    expect(out.participants).toEqual([hero]);
    expect(out.scene).toMatchObject({ status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, completedAt: null });
    expect(out.scene?.startedAt).toBeInstanceOf(Date);
    expect(out.history).toEqual({ clear: true });
  });

  it("порожнє лобі — 422 invalid_target", async () => {
    await expect(createStartMutation(vi.fn())({ ...ctx, meta: { ...ctx.meta, setup: [] } } as never)).rejects.toMatchObject({ code: "invalid_target" });
  });
});

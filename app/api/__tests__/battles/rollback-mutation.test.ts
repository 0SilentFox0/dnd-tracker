import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { createRollbackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";

const ctx = context({ scene: { ...context().scene, eventSeq: 6, status: "completed" } });

const s = [splitParticipant(hero, { orderIndex: 0, isPending: false }), splitParticipant(goblin, { orderIndex: 1, isPending: false })];

const snapshot = { seq: 4, state: buildSnapshotState({ ...ctx.scene, status: "active", turnIndex: 1, eventSeq: 3 }, s, diffParticipants(s, s)) };

describe("rollback mutation", () => {
  it("відкат на подію в середині багатоподійної дії — до знімка першої події цієї дії", async () => {
    const load = vi.fn(async () => [snapshot]);

    const out = await createRollbackMutation(load)(ctx, { actionIndex: 5 });

    expect(load).toHaveBeenCalledWith("b1", 5);
    expect(out.history).toEqual({ cancelFromSeq: 4 });
    expect(out.scene).toMatchObject({ status: "active", turnIndex: 1, completedAt: null });
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
  });

  it("немає знімків — action_rejected", async () => {
    await expect(createRollbackMutation(vi.fn(async () => []))(ctx, { actionIndex: 1 })).rejects.toMatchObject({ code: "action_rejected" });
  });
});

import { describe, expect, it, vi } from "vitest";

import { context, participant } from "./fixtures";

import { initiativeRollMutation } from "@/lib/server/battles/mutations/initiative/initiative-roll-mutation";
import { createRollbackMutation } from "@/lib/server/battles/mutations/rollback/rollback-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";

const ids = (ps: { basicInfo: { id: string } }[]) => ps.map((p) => p.basicInfo.id);

describe("rollback of an initiative roll", () => {
  it("restores the pre-roll order and turn index", async () => {
    const before = ["a", "b", "c", "d", "e", "f"].map((id) => participant(id));

    const start = context({ participants: before, isDM: true, scene: { ...context().scene, turnIndex: 2, eventSeq: 7 } });

    const rolled = initiativeRollMutation(start, {});

    const after = { ...start, participants: rolled.participants, scene: { ...start.scene, ...rolled.scene, eventSeq: 8 } };

    const split = before.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false }));

    const snapshot = { seq: 8, state: buildSnapshotState(start.scene, split, diffParticipants(split, split)) };

    const out = await createRollbackMutation(vi.fn(async () => [snapshot]), vi.fn(async () => true))(after, { actionIndex: 8 });

    expect(out.scene?.turnIndex).toBe(2);
    expect(ids(out.participants)).toEqual(ids(before));
    expect(out.history).toEqual({ cancelFromSeq: 8 });
  });
});

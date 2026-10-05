import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { BattleSceneState } from "@/lib/utils/battle/store/types";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const scene: BattleSceneState = {
  id: "b1",
  campaignId: "c1",
  status: "active",
  round: 2,
  turnIndex: 1,
  version: 5,
  eventSeq: 9,
  pendingMoraleCheck: null,
  startedAt: null,
  completedAt: null,
};

describe("buildSnapshotState", () => {
  it("зберігає сцену і гарячий стан усіх учасників ДО дії, без важкого snapshot", () => {
    const p = createMockParticipant();

    const before = [splitParticipant(p, { orderIndex: 0, isPending: false })];

    const state = buildSnapshotState(scene, before, diffParticipants(before, before));

    expect(state.scene).toEqual({ round: 2, turnIndex: 1, status: "active", pendingMoraleCheck: null });
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0]).not.toHaveProperty("snapshot");
    expect(state.changedSnapshots).toBeUndefined();
    expect(state.removed).toBeUndefined();
  });

  it("якщо дія змінила snapshot — кладе СТАРИЙ snapshot; видалених — повністю", () => {
    const p = createMockParticipant();

    const q = createMockParticipant({ basicInfo: { ...p.basicInfo, id: "q" } });

    const before = [splitParticipant(p, { orderIndex: 0, isPending: false }), splitParticipant(q, { orderIndex: 1, isPending: false })];

    const buffed = { ...p, combatStats: { ...p.combatStats, armorClass: 99 } };

    const after = [splitParticipant(buffed, { orderIndex: 0, isPending: false })];

    const state = buildSnapshotState(scene, before, diffParticipants(before, after));

    expect(state.changedSnapshots?.p1).toEqual(before[0].snapshot);
    expect(state.removed?.map((r) => r.columns.id)).toEqual(["q"]);
  });
});

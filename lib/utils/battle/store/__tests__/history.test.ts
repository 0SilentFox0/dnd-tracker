import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { restoreParticipantsAt } from "@/lib/utils/battle/store/history";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store/types";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0,
  version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date() };

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", battleId: "b1" } });

const at = (i: number) => ({ orderIndex: i, isPending: false });

describe("restoreParticipantsAt", () => {
  it("повертає HP і бафф AC, змінені двома наступними діями", () => {
    const s0 = [splitParticipant(hero, at(0))];

    const hurt = { ...hero, combatStats: { ...hero.combatStats, currentHp: 5 } };

    const s1 = [splitParticipant(hurt, at(0))];

    const buffed = { ...hurt, combatStats: { ...hurt.combatStats, armorClass: 30 } };

    const s2 = [splitParticipant(buffed, at(0))];

    const snapshots = [
      { seq: 1, state: buildSnapshotState(scene, s0, diffParticipants(s0, s1)) },
      { seq: 2, state: buildSnapshotState({ ...scene, eventSeq: 1 }, s1, diffParticipants(s1, s2)) },
    ];

    const current: LoadedBattle = { scene: { ...scene, eventSeq: 2 }, meta, participants: [buffed], pending: [], isDM: true };

    const restored = restoreParticipantsAt(snapshots, current);

    expect(restored.participants).toEqual([hero]);
  });

  it("повертає учасника, видаленого пізніше, і прибирає доданого пізніше", () => {
    const goblin = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "gob", controlledBy: "dm" } });

    const wolf = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "wolf" } });

    const s0 = [splitParticipant(hero, at(0)), splitParticipant(goblin, at(1))];

    const s1 = [splitParticipant(hero, at(0)), splitParticipant(wolf, at(1))];

    const snapshots = [{ seq: 1, state: buildSnapshotState(scene, s0, diffParticipants(s0, s1)) }];

    const current: LoadedBattle = { scene, meta, participants: [hero, wolf], pending: [], isDM: true };

    expect(restoreParticipantsAt(snapshots, current).participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
  });
});

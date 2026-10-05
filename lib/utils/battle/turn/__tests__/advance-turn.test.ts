import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });

describe("advanceTurn", () => {
  it("передає хід наступному живому учаснику", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [], scene });

    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
  });

  it("після останнього — новий раунд", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.round).toBe(2);
  });

  it("саммони з pending входять у бій у новому раунді", () => {
    const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" } });

    const out = advanceTurn({ participants: [hero, goblin], pending: [wolf], scene: { ...scene, turnIndex: 1 } });

    expect(out.participants.map((p) => p.basicInfo.id)).toContain("wolf");
    expect(out.pending).toEqual([]);
  });

  it("усі вороги впали — бій завершено", () => {
    const dead = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    const out = advanceTurn({ participants: [hero, dead], pending: [], scene });

    expect(out.scene.status).toBe("completed");
  });

  it("невикористаний pendingMoraleCheck застосовується і скидається", () => {
    const out = advanceTurn({
      participants: [hero, goblin],
      pending: [],
      scene: {
        ...scene,
        pendingMoraleCheck: {
          participantId: "hero",
          d10Roll: 1,
          moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, message: "Пропуск", moralePositive: false },
        },
      },
    });

    expect(out.scene.pendingMoraleCheck).toBeNull();
    expect(out.actions.some((a) => a.resultText.length > 0)).toBe(true);
  });
});

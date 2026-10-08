import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";

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

  it("новий раунд починається з першого в пересортованому порядку (саммон не пропускає хід)", () => {
    const deadFirst = {
      ...hero,
      abilities: { ...hero.abilities, initiative: 20, baseInitiative: 20 },
      combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const },
    };

    const mid = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "mid" }, abilities: { ...base.abilities, initiative: 10, baseInitiative: 10 } });

    const enemy = { ...goblin, abilities: { ...goblin.abilities, initiative: 5, baseInitiative: 5 } };

    const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" }, abilities: { ...base.abilities, initiative: 30, baseInitiative: 30 } });

    const out = advanceTurn({ participants: [deadFirst, mid, enemy], pending: [wolf], scene: { ...scene, turnIndex: 2 } });

    expect(out.scene.round).toBe(2);
    expect(out.participants[out.scene.turnIndex ?? -1].basicInfo.id).toBe("wolf");
  });


  describe("додатковий хід від моралі", () => {
    const moraleExtra = {
      participantId: "hero",
      d10Roll: 10,
      moraleResult: { shouldSkipTurn: false, hasExtraTurn: true, message: "Додатковий хід", moralePositive: true },
    };

    const poisoned = (p: typeof hero) => ({
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "e1", name: "Отрута", type: "debuff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], dotDamage: { damagePerRound: 1, damageType: "poison" } }],
      },
    });

    it("мораль не створює клона, а позначає учасника", () => {
      const out = advanceTurn({ participants: [hero, goblin], pending: [], scene: { ...scene, turnIndex: 0, pendingMoraleCheck: moraleExtra } });

      expect(out.participants).toHaveLength(2);
      expect(out.participants[0].actionFlags.hasExtraTurn).toBe(true);
      expect(out.scene).toMatchObject({ turnIndex: 1, round: 1 });
    });

    it("наприкінці раунду учасник із додатковим ходом ходить ще раз у тому ж раунді, без повторного DoT і тривалостей", () => {
      const marked = poisoned({ ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true, hasExtraTurn: true } });

      const out = advanceTurn({ participants: [marked, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

      const extra = out.participants[0];

      expect(out.scene).toMatchObject({ turnIndex: 0, round: 1 });
      expect(extra.actionFlags).toMatchObject({ hasUsedAction: false, hasExtraTurn: false });
      expect(extra.combatStats.currentHp).toBe(hero.combatStats.currentHp);
      expect(extra.battleData.activeEffects[0].duration).toBe(2);
    });

    it("після додаткового ходу починається новий раунд", () => {
      const first = advanceTurn({
        participants: [{ ...hero, actionFlags: { ...hero.actionFlags, hasExtraTurn: true } }, goblin],
        pending: [],
        scene: { ...scene, turnIndex: 1 },
      });

      const second = advanceTurn({ participants: first.participants, pending: [], scene: { ...scene, ...first.scene, turnIndex: 0 } as typeof scene });

      expect(second.scene.round).toBe(2);
      expect(second.participants.every((p) => p.actionFlags.hasExtraTurn === false)).toBe(true);
    });
  });

  it("expireAtTurnEnd effects end with the owner's last turn", () => {
    const e = (duration: number) => ({ id: "x", name: "x", type: "debuff", duration, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], expireAtTurnEnd: true }) as never;

    const withE = (duration: number) => ({ ...hero, battleData: { ...hero.battleData, activeEffects: [e(duration)] } });

    expect(advanceTurn({ participants: [withE(1), goblin], pending: [], scene }).participants[0].battleData.activeEffects).toEqual([]);
    expect(advanceTurn({ participants: [withE(2), goblin], pending: [], scene }).participants[0].battleData.activeEffects).toHaveLength(1);
  });
});

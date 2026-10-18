import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
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
        activeEffects: [makeEffect("e1", { name: "Отрута", type: "debuff", dotDamage: { damagePerRound: 1, damageType: "poison" } })],
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

    it("додатковий хід скидає витрачений рух", () => {
      const marked = { ...hero, actionFlags: { ...hero.actionFlags, hasExtraTurn: true }, battleData: { ...hero.battleData, movementUsed: 6 } };

      const out = advanceTurn({ participants: [marked, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

      expect(out.participants[0].battleData.movementUsed).toBe(0);
    });

    it("додатковий хід без руху не додає movementUsed", () => {
      const marked = { ...hero, actionFlags: { ...hero.actionFlags, hasExtraTurn: true } };

      const out = advanceTurn({ participants: [marked, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

      expect(out.participants[0].battleData.movementUsed).toBeUndefined();
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

    it("успішна мораль у самому додатковому ході не дає ще одного — раунд закінчується", () => {
      const inExtra = { ...hero, battleData: { ...hero.battleData, extraTurnActive: true } };

      const out = advanceTurn({ participants: [inExtra, goblin], pending: [], scene: { ...scene, turnIndex: 0, pendingMoraleCheck: moraleExtra } });

      expect(out.scene.round).toBe(2);
      expect(out.participants.every((p) => !p.actionFlags.hasExtraTurn)).toBe(true);
    });
  });

  it("expireAtTurnEnd effects end with the owner's first full turn, not the turn they were applied in", () => {
    const withE = (armed: boolean) => ({ ...hero, battleData: { ...hero.battleData, activeEffects: [makeEffect("x", { type: "debuff", duration: 2, expireAtTurnEnd: true, armed })] } });

    expect(advanceTurn({ participants: [withE(true), goblin], pending: [], scene }).participants[0].battleData.activeEffects).toEqual([]);
    expect(advanceTurn({ participants: [withE(false), goblin], pending: [], scene }).participants[0].battleData.activeEffects).toHaveLength(1);
  });

  it("timed effects count down at the end of the owner's turn and log the expiry", () => {
    const withE = { ...hero, battleData: { ...hero.battleData, activeEffects: [makeEffect("a", { name: "Кам'яна шкіра", duration: 1, armed: true }), makeEffect("b", { duration: 2, armed: true })] } };

    const out = advanceTurn({ participants: [withE, goblin], pending: [], scene });

    expect(out.participants[0].battleData.activeEffects.map((e) => [e.id, e.duration])).toEqual([["b", 1]]);
    expect(out.actions.some((a) => a.resultText.includes("Кам'яна шкіра"))).toBe(true);
  });
});

describe("резерв", () => {
  const imp = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp", side: ParticipantSide.ENEMY, controlledBy: "dm" }, battleData: { ...base.battleData, reserved: true } });

  it("резерв не входить у чергу на новому раунді й лишається в pending", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [imp], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.round).toBe(2);
    expect(out.participants.map((p) => p.basicInfo.id)).not.toContain("imp");
    expect(out.pending.map((p) => p.basicInfo.id)).toEqual(["imp"]);
  });

  it("видимі вороги мертві, ворог у резерві — бій не завершується", () => {
    const dead = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    const out = advanceTurn({ participants: [hero, dead], pending: [imp], scene });

    expect(out.scene.status).toBe("active");
    expect(out.scene.completedAt).toBeUndefined();
    expect(out.pending).toHaveLength(1);
  });

  it("знімає revealPending з учасника, чий хід почався", () => {
    const revealed = { ...imp, battleData: { ...base.battleData, revealPending: true } };

    const out = advanceTurn({ participants: [hero, revealed, goblin], pending: [], scene });

    expect(out.scene.turnIndex).toBe(1);
    expect(out.participants[1].battleData.revealPending).toBeUndefined();
  });

  it("revealPending знімається з пропущеного (непритомного) учасника", () => {
    const down = { ...imp, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" as const }, battleData: { ...base.battleData, revealPending: true } };

    const out = advanceTurn({ participants: [hero, down, goblin], pending: [], scene });

    expect(out.scene.turnIndex).toBe(2);
    expect(out.participants[1].battleData.revealPending).toBeUndefined();
  });

  it("revealPending знімається з усіх при новому раунді", () => {
    const stale = { ...goblin, battleData: { ...goblin.battleData, revealPending: true } };

    const out = advanceTurn({ participants: [hero, stale], pending: [], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.round).toBe(2);
    expect(out.participants.every((p) => !p.battleData.revealPending)).toBe(true);
  });

  it("розкритий під час додаткового ходу ходить з наступного раунду, ніхто не ходить двічі в старому", () => {
    const extra = { ...hero, battleData: { ...hero.battleData, extraTurnActive: true } };

    const revealed = { ...imp, battleData: { ...base.battleData, revealPending: true } };

    const out = advanceTurn({ participants: [extra, revealed, goblin], pending: [], scene });

    expect(out.scene.round).toBe(scene.round + 1);
    expect(out.participants.every((p) => !p.battleData.revealPending)).toBe(true);
  });

  describe("очікування рішення ДМ (awaiting)", () => {
    const withInit = (p: typeof hero, n: number) => ({ ...p, abilities: { ...p.abilities, initiative: n, baseInitiative: n } });

    const deadGob = { ...withInit(goblin, 30), combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    it("новий раунд не починається з мертвого учасника", () => {
      const ally2 = withInit(createMockParticipant({ basicInfo: { ...base.basicInfo, id: "ally2" } }), 5);

      const out = advanceTurn({ participants: [deadGob, withInit(hero, 10), ally2], pending: [imp], scene: { ...scene, turnIndex: 2 } });

      expect(out.scene.round).toBe(2);
      expect(out.scene.status).toBe("active");
      expect(out.participants[out.scene.turnIndex ?? -1]?.basicInfo.id).toBe("hero");
    });

    it("берсерк у наступному слоті не діє автоматично", () => {
      const berserk = makeEffect("b", { effects: [{ type: "berserk", value: 50 }] as never });

      const rager = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "rager" }, battleData: { ...base.battleData, activeEffects: [berserk] } });

      const out = advanceTurn({ participants: [withInit(hero, 20), withInit(rager, 10), deadGob], pending: [imp], scene });

      expect(out.scene.turnIndex).toBe(1);
      expect(out.actions.filter((a) => a.id.startsWith("berserk"))).toEqual([]);
    });

    it("обидві сторони на полі полягли, у резерві хтось є — цикл не крутить раунди", () => {
      const deadHero = { ...withInit(hero, 10), combatStats: { ...hero.combatStats, currentHp: 0, status: "dead" as const } };

      const out = advanceTurn({ participants: [deadGob, deadHero], pending: [imp], scene });

      expect(out.scene.round).toBeLessThanOrEqual(2);
      expect(out.actions.filter((a) => a.id.startsWith("triggers-round"))).toEqual([]);
    });

    it("перемога під час циклу зупиняє бій", () => {
      const out = advanceTurn({ participants: [hero, deadGob], pending: [], scene });

      expect(out.scene.status).toBe("completed");
    });
  });
});

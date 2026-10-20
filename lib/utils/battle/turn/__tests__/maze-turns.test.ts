import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { BattleParticipant } from "@/types/battle";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const maze = { walls: [], exit: null, difficulty: "medium" as const, teleports: [], fog: [], marks: {}, dark: false };

const map = testMap(10, 10, { maze });

const mk = (id: string, side: ParticipantSide, data: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, side }, battleData: { ...b.battleData, ...data } };
};

const hero = (id: string, data = {}) => mk(id, ParticipantSide.ALLY, data);

const foe = (id: string, data = {}) => mk(id, ParticipantSide.ENEMY, data);

describe("maze: пропуск ходів", () => {
  it("сплячий і escaped пропускаються", () => {
    const order = [hero("h1"), foe("sleep", { dormant: true }), hero("gone", { escaped: true }), hero("h2")];

    const out = advanceTurn({ participants: order, pending: [], scene, map });

    expect(out.scene.turnIndex).toBe(3);
    expect(out.scene.round).toBe(1);
  });

  it("отрута на сплячому не тикає", () => {
    const poison = makeEffect("poison", { type: "debuff", duration: 3, dotDamage: { damagePerRound: 5, damageType: "poison" } });

    const sleeper = foe("sleep", { dormant: true, activeEffects: [poison] });

    const hp = sleeper.combatStats.currentHp;

    const out = advanceTurn({ participants: [hero("h1"), sleeper, hero("h2")], pending: [], scene, map });

    expect(out.participants.find((p) => p.basicInfo.id === "sleep")?.combatStats.currentHp).toBe(hp);
  });

  it("прокинутий із mazeWakeRound 3 не ходить у раунді 2, ходить у 3", () => {
    const order = [hero("h"), foe("w", { mazeWakeRound: 3 })];

    const r2 = advanceTurn({ participants: order, pending: [], scene: { ...scene, round: 2 }, map });

    expect(r2.scene).toMatchObject({ round: 3, turnIndex: 0 });

    const r3 = advanceTurn({ participants: order, pending: [], scene: { ...scene, round: 3 }, map });

    expect(r3.scene.turnIndex).toBe(1);
  });

  it("усі поза грою, крім одного героя: ходить лише він", () => {
    const order = [foe("a", { dormant: true }), hero("h"), foe("b", { dormant: true }), hero("x", { escaped: true })];

    const out = advanceTurn({ participants: order, pending: [], scene: { ...scene, turnIndex: 1 }, map });

    expect(out.scene).toMatchObject({ round: 2, turnIndex: 1 });
  });

  it("ніхто не ходить: раунд +1, без нескінченного циклу", () => {
    const order = [hero("h", { escaped: true }), foe("a", { dormant: true })];

    const out = advanceTurn({ participants: order, pending: [], scene, map });

    expect(out.scene.round).toBe(2);
    expect(out.scene.turnIndex).toBe(0);
  });
});

describe("maze: перемога", () => {
  const dead = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD } });

  it("сплячий ворог живий: без перемоги", () => {
    const v = checkVictoryConditions([hero("h"), foe("s", { dormant: true })]);

    expect(v).toMatchObject({ isVictory: false, awaiting: null });
  });

  it("усі вороги мертві, сплячі теж: перемога", () => {
    const v = checkVictoryConditions([hero("h"), dead(foe("s", { dormant: true }))]);

    expect(v.isVictory).toBe(true);
  });

  it("усі живі герої вибралися: очікування рішення ДМ", () => {
    const v = checkVictoryConditions([hero("h", { escaped: true }), dead(hero("d")), foe("s", { dormant: true })]);

    expect(v).toMatchObject({ awaiting: "victory", message: "Усі живі герої вибралися — рішення за ДМ" });
  });

  it("є герой на полі: бій триває", () => {
    const v = checkVictoryConditions([hero("h", { escaped: true }), hero("p"), foe("s")]);

    expect(v.awaiting).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyCriticalEffect } from "@/lib/utils/battle/attack";
import { endTurnCleanup } from "@/lib/utils/battle/turn/end-turn-cleanup";
import { processStartOfRound, processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import type { ActiveEffect, BattleMapConfig, BattleParticipant } from "@/types/battle";

const debuff = (type: string, duration: number): ActiveEffect => makeEffect(`e-${type}`, { name: type, type: "debuff", duration, effects: [{ type, value: 0 }] });

describe("processStartOfTurn", () => {
  it("дебаф на 1 раунд діє в цей хід і спливає наприкінці ходу", () => {
    const base = createMockParticipant();

    const p = createMockParticipant({
      battleData: { ...base.battleData, activeEffects: [debuff("no_bonus_action", 1), debuff("no_reaction", 1)] },
    });

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags.hasUsedBonusAction).toBe(true);
    expect(out.participant.actionFlags.hasUsedReaction).toBe(true);
    expect(out.expiredEffects).toEqual([]);
    expect(endTurnCleanup(out.participant).battleData.activeEffects).toEqual([]);
  });

  it("без обмежень — дії доступні", () => {
    const p = createMockParticipant();

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags).toMatchObject({ hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false });
  });
});

describe("рух на початку ходу", () => {
  it("на початку власного ходу обнуляє пройдений рух", () => {
    const base = createMockParticipant();

    const p = createMockParticipant({ battleData: { ...base.battleData, movementUsed: 4 } });

    expect(processStartOfTurn(p, 2, [p]).participant.battleData.movementUsed).toBe(0);
  });

  it("без пройденого руху поле не зʼявляється", () => {
    const p = createMockParticipant();

    expect(processStartOfTurn(p, 2, [p]).participant.battleData.movementUsed).toBeUndefined();
  });
});

describe("critical effects at the start of turn", () => {
  const crit = (type: CriticalEffectType): CriticalEffect => ({ id: 1, name: "Е", description: "о", type: "success", flavor: [], effect: { type, duration: type === "lose_action" ? 1 : 2 } });

  const hit = (type: CriticalEffectType) => applyCriticalEffect(createMockParticipant(), crit(type), 1);

  it("lose_action takes the action on the next turn", () => {
    const p = hit("lose_action");

    expect(processStartOfTurn(p, 2, [p], () => 0.5).participant.actionFlags.hasUsedAction).toBe(true);
  });

  it("lose_reaction is spent at once and restored next turn", () => {
    const p = hit("lose_reaction");

    expect(p.actionFlags.hasUsedReaction).toBe(true);
    expect(processStartOfTurn(p, 2, [p]).participant.actionFlags.hasUsedReaction).toBe(false);
  });

  it("block_bonus_action takes the bonus action on the next turn", () => {
    const p = hit("block_bonus_action");

    expect(processStartOfTurn(p, 2, [p]).participant.actionFlags.hasUsedBonusAction).toBe(true);
  });
});

describe("processStartOfRound", () => {
  it("сортує за ініціативою, далі базовою ініціативою, далі спритністю", () => {
    const base = createMockParticipant();

    const make = (id: string, baseInitiative: number, dexterity: number) =>
      createMockParticipant({ basicInfo: { ...base.basicInfo, id }, abilities: { ...base.abilities, initiative: baseInitiative, baseInitiative, dexterity } });

    const out = processStartOfRound([make("a", 10, 12), make("b", 15, 10), make("c", 10, 16)], 2);

    expect(out.updatedInitiativeOrder.map((p) => p.basicInfo.id)).toEqual(["b", "c", "a"]);
  });
});

it("processStartOfRound додає саммонів, але не резерв", () => {
  const b = createMockParticipant();

  const hero = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "hero" } });

  const wolf = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "wolf" } });

  const imp = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "imp" }, battleData: { ...b.battleData, reserved: true } });

  const ids = processStartOfRound([hero], 2, [wolf, imp]).updatedInitiativeOrder.map((p) => p.basicInfo.id);

  expect(ids).toContain("wolf");
  expect(ids).not.toContain("imp");
});

describe("небезпека на початку ходу", () => {
  const map: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.3, terrain: { "1:1": { kind: "hazard", label: "Вогонь", damage: { amount: 5, type: "fire" } } } };

  const standing = (hp = 20, over: Partial<BattleParticipant["battleData"]> = {}) => {
    const base = createMockParticipant();

    return createMockParticipant({ combatStats: { ...base.combatStats, currentHp: hp }, battleData: { ...base.battleData, position: { x: 1, y: 1 }, ...over } });
  };

  it("завдає шкоди й пише її в damageMessages", () => {
    const p = standing();

    const out = processStartOfTurn(p, 2, [p], () => 0, map);

    expect(out.damageMessages).toEqual(["Тест: 5 fire шкоди від «Вогонь»"]);
    expect(out.participant.combatStats.currentHp).toBe(15);
    expect(out.participant.battleData.hazardHitRound).toBe(2);
  });

  it("уже отримав шкоду в цьому раунді або без карти — нічого", () => {
    const hit = standing(20, { hazardHitRound: 2 });

    expect(processStartOfTurn(hit, 2, [hit], () => 0, map).damageMessages).toEqual([]);

    const p = standing();

    expect(processStartOfTurn(p, 2, [p], () => 0).damageMessages).toEqual([]);
  });

  it("імунітет до заклинання, що створило зону, — шкоди немає", () => {
    const wall: BattleMapConfig = { ...map, terrain: { "1:1": { kind: "hazard", label: "Вогняна стіна", damage: { amount: 5, type: "fire", spellId: "wall-of-fire" } } } };

    const p = grantPassive(standing(), [{ kind: "flag", flag: "spellImmunity" }]);

    const out = processStartOfTurn(p, 2, [p], () => 0, wall);

    expect(out.damageMessages).toEqual([]);
    expect(out.participant.combatStats.currentHp).toBe(20);
  });

  it("смерть від небезпеки обробляється як від DoT", () => {
    const p = standing(3);

    const out = processStartOfTurn(p, 2, [p], () => 0, map);

    expect(out.statusChanged).toBe(true);
    expect(out.participant.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
  });
});

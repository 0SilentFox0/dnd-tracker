import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import { makeEffect, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { applyCriticalEffect } from "@/lib/utils/battle/attack";
import { endTurnCleanup } from "@/lib/utils/battle/turn/end-turn-cleanup";
import { processStartOfRound, processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
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

  it("запамʼятовує стартову клітинку ходу і скидає прапорець повернення", () => {
    const base = createMockParticipant();

    const p = createMockParticipant({ battleData: { ...base.battleData, position: { x: 3, y: 1 }, returnedThisTurn: true } });

    const { battleData } = processStartOfTurn(p, 2, [p]).participant;

    expect(battleData.turnStartPosition).toEqual({ x: 3, y: 1 });
    expect(battleData.returnedThisTurn).toBeUndefined();
  });

  it("без позиції на карті стартової клітинки немає", () => {
    const p = createMockParticipant();

    expect(processStartOfTurn(p, 2, [p]).participant.battleData.turnStartPosition).toBeUndefined();
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

  it("завдає шкоди й повертає її окремо від damageMessages", () => {
    const p = standing();

    const out = processStartOfTurn(p, 2, [p], () => 0, map);

    expect(out.damageMessages).toEqual([]);
    expect(out.hazard).toEqual({ message: "Тест: 5 fire шкоди від «Вогонь»", damage: 5, hpBefore: 20, label: "Вогонь", damageType: "fire" });
    expect(out.participant.combatStats.currentHp).toBe(15);
    expect(out.participant.battleData.hazardHitRound).toBe(2);
  });

  it("DoT і небезпека: damageMessages лише DoT, hpBefore небезпеки — HP після DoT", () => {
    const p = standing(20, { activeEffects: [makeEffect("burn", { name: "Опік", type: "debuff", dotDamage: { damagePerRound: 3, damageType: "fire" } })] });

    const out = processStartOfTurn(p, 2, [p], () => 0, map);

    expect(out.damageMessages).toEqual(["Тест: 3 fire шкоди від Опік"]);
    expect(out.hazard).toMatchObject({ hpBefore: 17, damage: 5 });
    expect(out.participant.combatStats.currentHp).toBe(12);
  });

  it("уже отримав шкоду в цьому раунді або без карти — нічого", () => {
    const hit = standing(20, { hazardHitRound: 2 });

    expect(processStartOfTurn(hit, 2, [hit], () => 0, map).hazard).toBeUndefined();

    const p = standing();

    expect(processStartOfTurn(p, 2, [p], () => 0).hazard).toBeUndefined();
  });

  it("імунітет до заклинання, що створило зону, — шкоди немає", () => {
    const wall: BattleMapConfig = { ...map, terrain: { "1:1": { kind: "hazard", label: "Вогняна стіна", damage: { amount: 5, type: "fire", spellId: "wall-of-fire" } } } };

    const p = grantPassive(standing(), [{ kind: "flag", flag: "spellImmunity" }]);

    const out = processStartOfTurn(p, 2, [p], () => 0, wall);

    expect(out.hazard).toBeUndefined();
    expect(out.participant.combatStats.currentHp).toBe(20);
  });

  it("смерть від небезпеки обробляється як від DoT", () => {
    const p = standing(3);

    const out = processStartOfTurn(p, 2, [p], () => 0, map);

    expect(out.statusChanged).toBe(true);
    expect(out.participant.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
  });
});

describe("приземлення після піке", () => {
  const map: BattleMapConfig = testMap();

  const flying = (since: number) => {
    const base = createMockParticipant();

    return createMockParticipant({ battleData: { ...base.battleData, airborne: { landAt: { x: 4, y: 4 }, since, percent: 200, name: "Пікірування" } } });
  };

  it("у раунд піке лишається в повітрі", () => {
    const g = flying(2);

    expect(processStartOfTurn(g, 2, [g], () => 0.5, map).participant.battleData.airborne).toBeDefined();
  });

  it("у наступний раунд приземляється", () => {
    const g = flying(1);

    const out = processStartOfTurn(g, 2, [g], () => 0.5, map).participant;

    expect(out.battleData.airborne).toBeUndefined();
    expect(out.battleData.position).toEqual({ x: 4, y: 4 });
  });
});

describe("детермінований контракт початку ходу", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("фіксує повний результат recharge, DOT, hazard, HOT, concentration, expiry та abilities", () => {
    const base = createMockParticipant();

    const participant = createMockParticipant({
      combatStats: { ...base.combatStats, currentHp: 25, maxHp: 40 },
      battleData: {
        ...base.battleData, position: { x: 1, y: 1 },
        pools: { breath: { label: "Подих", max: 1, rest: null, recharge: 5 }, roar: { label: "Рик", max: 1, rest: null, recharge: 6 } },
        abilityUsage: { breath: { battle: 1, round: 0, turn: 0, lastRound: 1 }, roar: { battle: 1, round: 0, turn: 0, lastRound: 1 } },
        activeEffects: [
          makeEffect("concentration", { concentration: { castId: "cast", spellName: "Захист" } }),
          makeEffect("burn", { dotDamage: { damagePerRound: 3, damageType: "fire" } }),
          makeEffect("regen", { hotHeal: { healPerRound: 2 } }),
          makeEffect("expired", { duration: 1, countdownAtTurnStart: true }),
          makeEffect("skip", { effects: [{ type: "skip_action", value: 25 }] }),
        ],
        resolvedAbilities: [resolved({ id: "heal", trigger: { event: "turnStart" }, limits: { chance: 50 }, effects: [{ kind: "heal", amount: 2, target: "self" }] })],
      },
    });

    const linked = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "linked" }, battleData: { ...base.battleData, activeEffects: [makeEffect("linked", { concentrationOf: { casterId: "p1", castId: "cast" } })] } });

    const map: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.3, terrain: { "1:1": { kind: "hazard", label: "Вогонь", damage: { dice: "1d6", type: "fire" } } } };

    const values = [0.91, 0.12, 0.74, 0.03, 0.08, 0.87, 0.27];

    let i = 0;

    const rng = vi.fn(() => {
      if (i >= values.length) throw new Error("Unexpected RNG call");

      return values[i++];
    });

    const input = structuredClone([participant, linked]);

    const result = processStartOfTurn(participant, 2, [participant, linked], rng, map, { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } });

    expect(rng).toHaveBeenCalledTimes(values.length);
    expect({ result, rngCalls: rng.mock.results.map((r) => r.value) }).toMatchSnapshot();
    expect([participant, linked]).toEqual(input);
  });
});

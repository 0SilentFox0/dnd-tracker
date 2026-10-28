import { describe, expect, it } from "vitest";

import { canConsumeIntent, isIntentStale, participantAttackIntent, type ParticipantClickScene } from "../attack-intent";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const intent = { targetId: "e", actorId: "h1", round: 2, turnIndex: 3 };

const turn = { heroId: "h1", round: 2, turnIndex: 3, phase: "acting", actionUsed: false, skipped: false };

describe("намір атаки з карти", () => {
  it("споживається тим самим героєм у тому самому ході у фазі дії", () => {
    expect(canConsumeIntent(intent, turn)).toBe(true);
  });

  it("інший герой, інший хід чи раунд — не споживається", () => {
    expect(canConsumeIntent(intent, { ...turn, heroId: "h2" })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, turnIndex: 4 })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, round: 3 })).toBe(false);
  });

  it("не у фазі дії, дія використана або хід пропущено — не споживається", () => {
    expect(canConsumeIntent(intent, { ...turn, phase: "morale" })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, actionUsed: true })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, skipped: true })).toBe(false);
  });

  it("застарілий при зміні ходу чи раунду", () => {
    expect(isIntentStale(intent, { round: 2, turnIndex: 3 })).toBe(false);
    expect(isIntentStale(intent, { round: 2, turnIndex: 4 })).toBe(true);
    expect(isIntentStale(intent, { round: 3, turnIndex: 3 })).toBe(true);
  });
});

const sword = { id: "sword", name: "Меч", type: AttackType.MELEE } as BattleAttack;

function unit(id: string, side: ParticipantSide, over: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side }, battleData: { ...p.battleData, attacks: [sword], ...over } };
}

function clickScene(over: Partial<ParticipantClickScene> = {}, order = [unit("h", ParticipantSide.ALLY), unit("e", ParticipantSide.ENEMY), unit("a", ParticipantSide.ALLY)]): ParticipantClickScene {
  return {
    battle: { map: null, initiativeOrder: order, currentRound: 2, currentTurnIndex: 0 },
    turn: { current: order[0], isMyTurn: true },
    anyPending: false,
    attackReady: true,
    ...over,
  };
}

describe("participantAttackIntent", () => {
  it("ворог без карти — намір першою ближньою зброєю", () => {
    expect(participantAttackIntent(clickScene(), "e")).toEqual({ targetId: "e", attackId: "sword", actorId: "h", round: 2, turnIndex: 0 });
  });

  it("своя сторона чи сам герой — лише вибір", () => {
    expect(participantAttackIntent(clickScene(), "a")).toBeNull();
    expect(participantAttackIntent(clickScene(), "h")).toBeNull();
  });

  it("ворог у резерві — лише вибір", () => {
    const order = [unit("h", ParticipantSide.ALLY), unit("e", ParticipantSide.ENEMY, { reserved: true })];

    expect(participantAttackIntent(clickScene({}, order), "e")).toBeNull();
  });

  it("мутація в дорозі чи не мій хід — лише вибір", () => {
    expect(participantAttackIntent(clickScene({ anyPending: true }), "e")).toBeNull();
    expect(participantAttackIntent(clickScene({ turn: { current: null, isMyTurn: false } }), "e")).toBeNull();
  });

  it("фаза ходу не дозволяє атаку (мораль, кінець ходу) — лише вибір", () => {
    expect(participantAttackIntent(clickScene({ attackReady: false }), "e")).toBeNull();
  });

  it("на карті ціль недосяжна — лише вибір", () => {
    const order = [unit("h", ParticipantSide.ALLY, { position: { x: 0, y: 0 } }), unit("e", ParticipantSide.ENEMY, { position: { x: 5, y: 0 } })];

    const map = { cols: 10, rows: 5, background: null, opacity: 0.3 };

    expect(participantAttackIntent(clickScene({ battle: { map, initiativeOrder: order, currentRound: 2, currentTurnIndex: 0 } }, order), "e")).toBeNull();
  });
});

describe("participantAttackIntent: герой, що вмирає", () => {
  const downed = (deathSaves?: { successes: number; failures: number; stable: boolean }) => {
    const p = unit("d", ParticipantSide.ALLY, { deathSaves });

    return { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: "unconscious" as const } };
  };

  const order = (d: BattleParticipant) => [unit("e", ParticipantSide.ENEMY), d];

  const scene = (d: BattleParticipant) => clickScene({ turn: { current: order(d)[0], isMyTurn: true } }, order(d));

  it("ворог може обрати ціллю", () => {
    expect(participantAttackIntent(scene(downed({ successes: 0, failures: 0, stable: false })), "d")).toMatchObject({ targetId: "d" });
  });

  it("без кидків смерті (HOMM) — лише вибір", () => {
    expect(participantAttackIntent(scene(downed()), "d")).toBeNull();
  });
});

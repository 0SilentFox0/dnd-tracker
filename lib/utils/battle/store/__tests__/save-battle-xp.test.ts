import { describe, expect, it, vi } from "vitest";

import { BattleStatus, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { LoadedBattle, NewBattleEvent } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const hero = (id: string, sourceId: string): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, sourceId, sourceType: "character", side: ParticipantSide.ALLY } };
};

const ogre = (): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id: "ogre", sourceId: "u-ogre", sourceType: "unit", side: ParticipantSide.ENEMY, xp: 450 }, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.DEAD } };
};

const ON: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp: true }, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } };

const loaded = (rules: Ruleset, participants: BattleParticipant[]): LoadedBattle => ({
  scene: { id: "b1", campaignId: "c1", status: BattleStatus.ACTIVE, round: 3, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules, map: null, createdAt: new Date() },
  participants,
  pending: [],
  isDM: true,
});

const resultEvent = (battleResult: "victory" | "defeat"): NewBattleEvent => ({ type: "end_turn", round: 3, resultText: "кінець", details: { actionDetails: { battleResult } } });

function fakeDb() {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    character: { findMany: vi.fn(async () => [{ id: "ch-1" }, { id: "ch-2" }]), update: vi.fn(async () => ({})), updateMany: vi.fn() },
    characterLog: { createMany: vi.fn(async () => ({ count: 2 })) },
    $queryRaw: vi.fn(async () => [{ id: "ch-1", resources: {}, experience: 100 }, { id: "ch-2", resources: {}, experience: 0 }]),
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const COMPLETE = { status: BattleStatus.COMPLETED, completedAt: new Date() };

const ps = () => [hero("h1", "ch-1"), hero("h2", "ch-2"), ogre()];

describe("saveBattle: авто-досвід", () => {
  it("перемога: XP порівну, з блокуванням рядків і журналом", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, loaded(ON, ps()), { participants: ps(), pending: [], events: [resultEvent("victory")], scene: COMPLETE });

    expect(tx.character.findMany).toHaveBeenCalledWith({ where: { id: { in: ["ch-1", "ch-2"] }, campaignId: "c1", status: "active" }, select: { id: true } });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-1" }, data: { experience: 325 } });
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-2" }, data: { experience: 225 } });
    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "ch-1", kind: "xp", actorUserId: null, data: { amount: 225, total: 325, note: "Перемога в бою", battleId: "b1" } }), expect.objectContaining({ characterId: "ch-2" })] });
  });

  it("поразка, вимкнене правило або бій не завершується — нічого", async () => {
    for (const [rules, events, scene] of [
      [ON, [resultEvent("defeat")], COMPLETE],
      [{ ...ON, outOfCombat: DEFAULT_RULES.outOfCombat }, [resultEvent("victory")], COMPLETE],
      [ON, [resultEvent("victory")], { turnIndex: 1 }],
    ] as const) {
      const { db, tx } = fakeDb();

      await saveBattle(db, loaded(rules, ps()), { participants: ps(), pending: [], events: [...events], scene });

      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.character.update).not.toHaveBeenCalled();
    }
  });
});

// lib/utils/battle/store/__tests__/save-battle-resources.test.ts
import { describe, expect, it, vi } from "vitest";

import { BattleStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { LoadedBattle } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const hero = (id: string, sourceId: string, stats: Partial<BattleParticipant["combatStats"]> = {}, info: Partial<BattleParticipant["basicInfo"]> = {}): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, sourceId, sourceType: "character", ...info }, combatStats: { ...p.combatStats, ...stats } };
};

const RULES: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true, inspiration: true } };

const loaded = (rules: Ruleset, participants: BattleParticipant[], pending: BattleParticipant[] = []): LoadedBattle => ({
  scene: { id: "b1", campaignId: "c1", status: BattleStatus.ACTIVE, round: 3, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, critChoiceByDm: false, rules, map: null, createdAt: new Date() },
  participants,
  pending,
  isDM: true,
});

function fakeDb(rows: Array<{ id: string; resources: unknown }>) {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    character: { findMany: vi.fn(async () => rows), update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
    characterLog: { createMany: vi.fn(async () => ({ count: 0 })) },
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const COMPLETE = { status: BattleStatus.COMPLETED, completedAt: new Date() };

describe("saveBattle: resources write-back", () => {
  it("rules off → characters untouched", async () => {
    const a = hero("pa", "ch-a", { currentHp: 5 });

    const { db, tx } = fakeDb([]);

    await saveBattle(db, loaded(DEFAULT_RULES, [a]), { participants: [a], pending: [], events: [], scene: COMPLETE });

    expect(tx.character.findMany).not.toHaveBeenCalled();
  });

  it("not completing → characters untouched", async () => {
    const a = hero("pa", "ch-a", { currentHp: 5 });

    const { db, tx } = fakeDb([]);

    await saveBattle(db, loaded(RULES, [a]), { participants: [a], pending: [], events: [], scene: { turnIndex: 0 } });

    expect(tx.character.findMany).not.toHaveBeenCalled();
  });

  it("one write per hero from the field; extra-turn slot, units and reserve skipped", async () => {
    const slot = hero("pa-x", "ch-a", { currentHp: 20 }, { isExtraTurnSlot: true });

    const a = hero("pa", "ch-a", { currentHp: 7, maxHp: 20 });

    const unit = hero("u1", "unit-1", { currentHp: 1 }, { sourceType: "unit" });

    const reserve = hero("pb", "ch-b", { currentHp: 2 });

    const { db, tx } = fakeDb([{ id: "ch-a", resources: { shortRestOpen: true, hitDiceSpent: { f: 1 } } }]);

    await saveBattle(db, loaded(RULES, [slot, a, unit], [reserve]), { participants: [slot, a, unit], pending: [reserve], events: [], scene: COMPLETE });

    expect(tx.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["ch-a"] }, campaignId: "c1" } }));
    expect(tx.character.update).toHaveBeenCalledTimes(1);
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-a" }, data: { resources: { hp: 7, hitDiceSpent: { f: 1 } } } });
    expect(tx.character.updateMany).not.toHaveBeenCalled();
    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "ch-a", kind: "battle_result", actorUserId: null, data: expect.objectContaining({ battleId: "b1", hpBefore: 20, hpAfter: 7 }) })] });
  });

  it("dead hero is written; inspiration cleared only when spent in the battle", async () => {
    const a = hero("pa", "ch-a", { currentHp: 0, status: "dead" });

    a.battleData = { ...a.battleData, inspiration: false, inspirationSpent: true };

    const { db, tx } = fakeDb([{ id: "ch-a", resources: {} }]);

    await saveBattle(db, loaded(RULES, [a]), { participants: [a], pending: [], events: [], scene: COMPLETE });

    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-a" }, data: { resources: { hp: 0, dead: true } } });
    expect(tx.character.updateMany).toHaveBeenCalledWith({ where: { id: "ch-a", inspiration: true }, data: { inspiration: false } });
  });

  it("never writes inspiration true from a battle (stale participant value, unspent)", async () => {
    const a = hero("pa", "ch-a", { currentHp: 5 });

    a.battleData = { ...a.battleData, inspiration: true };

    const { db, tx } = fakeDb([{ id: "ch-a", resources: {} }]);

    await saveBattle(db, loaded(RULES, [a]), { participants: [a], pending: [], events: [], scene: COMPLETE });

    expect(tx.character.updateMany).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(tx.character.update).mock.calls)).not.toContain("inspiration");
  });
});

import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { BattleMutationOutcome, LoadedBattle } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = { cols: 8, rows: 8, background: null, opacity: 0.3, terrain: { "1:1": { kind: "barrier", untilRound: 2 } } };

const hero = createMockParticipant();

const before: LoadedBattle = {
  scene: {
    id: "b1", campaignId: "c1", status: "active", round: 2, turnIndex: 0, version: 3,
    eventSeq: 4, pendingMoraleCheck: null, startedAt: null, completedAt: null,
  },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map, createdAt: new Date() },
  participants: [hero],
  pending: [],
  isDM: true,
};

function fakeDb() {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const event = { type: "turn", round: 2, resultText: "Хід" };

describe("saveBattle: карта", () => {
  it("пише колонку map, коли вона в патчі; null — DbNull", async () => {
    const next = { ...map, terrain: undefined };

    const { db, tx } = fakeDb();

    await saveBattle(db, before, { participants: [hero], pending: [], events: [], scene: { map: next } });

    expect(tx.battleScene.updateMany.mock.calls[0]).toMatchObject([{ data: { map: next } }]);

    const cleared = fakeDb();

    await saveBattle(cleared.db, before, { participants: [hero], pending: [], events: [], scene: { map: null } });

    expect((cleared.tx.battleScene.updateMany.mock.calls[0] as unknown as [{ data: { map: unknown } }])[0].data.map).toBe(Prisma.DbNull);
  });

  it("без map у патчі колонку не чіпає", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, before, { participants: [hero], pending: [], events: [], scene: { turnIndex: 0 } });

    expect((tx.battleScene.updateMany.mock.calls[0] as unknown as [{ data: object }])[0].data).not.toHaveProperty("map");
  });

  it("знімок для відкату тримає місцевість ДО дії", async () => {
    const { db, tx } = fakeDb();

    const outcome: BattleMutationOutcome = { participants: [hero], pending: [], events: [event], scene: { round: 3, map: { ...map, terrain: undefined } } };

    await saveBattle(db, before, outcome);

    const [[{ data }]] = tx.battleSnapshot.createMany.mock.calls as unknown as [[{ data: Array<{ state: { scene: { terrain: unknown } } }> }]];

    expect(data[0].state.scene.terrain).toEqual(map.terrain);
  });

  it("збереження бою ніколи не пише колонку audio", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, { ...before, meta: { ...before.meta, audio: { trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq: 1 } } }, { participants: [hero], pending: [], events: [event], scene: { turnIndex: 0 } });

    expect((tx.battleScene.updateMany.mock.calls[0] as unknown as [{ data: object }])[0].data).not.toHaveProperty("audio");
  });
});

describe("saveBattle: правила", () => {
  it("пише колонку rules, коли вона в патчі", async () => {
    const { db, tx } = fakeDb();

    const rules = { ...DEFAULT_RULES, morale: { ...DEFAULT_RULES.morale, enabled: false } };

    await saveBattle(db, before, { participants: [hero], pending: [], events: [], scene: { rules } });

    expect(tx.battleScene.updateMany.mock.calls[0]).toMatchObject([{ data: { rules } }]);
  });

  it("без rules у патчі колонку не чіпає", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, before, { participants: [hero], pending: [], events: [], scene: { turnIndex: 0 } });

    expect((tx.battleScene.updateMany.mock.calls[0] as unknown as [{ data: object }])[0].data).not.toHaveProperty("rules");
  });
});

import { describe, expect, it, vi } from "vitest";

import { type BattleDb, loadBattle } from "../load-battle";

import { DEFAULT_RULES } from "@/lib/utils/rules";

function fakeDb(row: { status: string; rules: unknown; campaignRules: unknown }) {
  const findFirst = vi.fn(async () => ({
    id: "b1",
    campaignId: "c1",
    name: "Бій",
    description: null,
    status: row.status,
    currentRound: 1,
    currentTurnIndex: 0,
    version: 1,
    eventSeq: 0,
    pendingMoraleCheck: null,
    map: null,
    audio: null,
    rules: row.rules,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(0),
    participants: [],
    battleParticipants: [],
    campaign: { friendlyFire: false, rules: row.campaignRules, members: [{ role: "dm" }] },
  }));

  return { battleScene: { findFirst }, battleParticipant: { findMany: vi.fn(async () => []) } } as unknown as BattleDb;
}

const load = (db: BattleDb) => loadBattle(db, { battleId: "b1", campaignId: "c1", userId: "dm" });

const campaignRules = { morale: { enabled: false } };

describe("loadBattle: правила бою", () => {
  it("prepared без копії бере живі правила кампанії", async () => {
    const loaded = await load(fakeDb({ status: "prepared", rules: null, campaignRules }));

    expect(loaded?.meta.rules.morale.enabled).toBe(false);
  });

  it("active з копією на старті не підхоплює пізніші зміни кампанії", async () => {
    const loaded = await load(fakeDb({ status: "active", rules: {}, campaignRules }));

    expect(loaded?.meta.rules).toEqual(DEFAULT_RULES);
  });

  it("active з копією правил читає саме її", async () => {
    const loaded = await load(fakeDb({ status: "active", rules: { morale: { enabled: false } }, campaignRules: {} }));

    expect(loaded?.meta.rules.morale.enabled).toBe(false);
  });

  it("active без копії (бій до деплою) — старі константи", async () => {
    const loaded = await load(fakeDb({ status: "active", rules: null, campaignRules }));

    expect(loaded?.meta.rules).toEqual(DEFAULT_RULES);
  });
});

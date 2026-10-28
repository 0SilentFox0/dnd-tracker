import { describe, expect, it, vi } from "vitest";

import { type BattleDb, loadBattle } from "../load-battle";

import { DEFAULT_RULES } from "@/lib/utils/rules";

function fakeDb(row: { status: string; rules: unknown; campaignRules: unknown }) {
  const findFirst = vi.fn(async (args?: { select?: { campaign?: { select?: Record<string, unknown> } } }) => args?.select?.campaign?.select?.rules ? { campaign: { rules: row.campaignRules } } : ({
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
    campaign: { friendlyFire: false, members: [{ role: "dm" }] },
  }));

  return { battleScene: { findFirst }, battleParticipant: { findMany: vi.fn(async () => []) } } as unknown as BattleDb & {
    battleScene: { findFirst: typeof findFirst };
  };
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

  it("active не читає campaign.rules", async () => {
    const db = fakeDb({ status: "active", rules: {}, campaignRules }) as ReturnType<typeof fakeDb>;

    await load(db);

    const selects = (db.battleScene.findFirst as unknown as { mock: { calls: Array<[{ select: { campaign?: { select: object } } }]> } }).mock.calls;

    expect(selects).toHaveLength(1);
    expect(selects[0][0].select.campaign?.select).not.toHaveProperty("rules");
  });

  it("prepared читає campaign.rules окремим запитом", async () => {
    const db = fakeDb({ status: "prepared", rules: null, campaignRules });

    await load(db);

    expect(db.battleScene.findFirst).toHaveBeenCalledTimes(2);
  });
});

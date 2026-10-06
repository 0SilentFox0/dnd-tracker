import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./battles/fixtures";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { defaultPipelineDeps, defaultReadDeps } from "@/lib/utils/battle/pipeline/default-deps";

vi.mock("@/lib/utils/battle/pipeline/default-deps", () => ({
  defaultPipelineDeps: {
    getUserId: vi.fn(),
    rateLimit: vi.fn(),
    loadBattle: vi.fn(),
    saveBattle: vi.fn(),
    publish: vi.fn(),
    loadRecentEvents: vi.fn(),
    loadKnowledge: vi.fn(),
  },
  defaultReadDeps: { getUserId: vi.fn(), loadAccess: vi.fn(), loadEventsBefore: vi.fn() },
}));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn(), requireAuth: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } } }));

const params = { params: Promise.resolve({ id: "c1", battleId: "b1" }) };

const deps = vi.mocked(defaultPipelineDeps);

const readDeps = vi.mocked(defaultReadDeps);

const loadKnowledge = vi.mocked(defaultPipelineDeps.loadKnowledge as NonNullable<typeof defaultPipelineDeps.loadKnowledge>);

function loaded(isDM = false) {
  const ctx = context({ isDM });

  return { scene: ctx.scene, meta: ctx.meta, participants: [hero, goblin], pending: [], isDM, isMember: true };
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.getUserId.mockResolvedValue("user-1");
  deps.loadBattle.mockResolvedValue(loaded() as never);
  deps.loadRecentEvents.mockResolvedValue([{ actionIndex: 3, resultText: "Удар" } as never]);
  readDeps.getUserId.mockResolvedValue("user-1");
  readDeps.loadAccess.mockResolvedValue({ version: 9, isMember: true });
  readDeps.loadEventsBefore.mockResolvedValue({ events: [{ actionIndex: 1, resultText: "Старт" } as never], hasMore: false });
});

describe("GET /battles/[battleId]?versionOnly=1", () => {
  it("віддає лише версію і не завантажує бій", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await GET(new Request("http://x/api?versionOnly=1"), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 9 });
    expect(readDeps.loadAccess).toHaveBeenCalledWith({ battleId: "b1", campaignId: "c1", userId: "user-1" });
    expect(deps.loadBattle).not.toHaveBeenCalled();
  });

  it("без сесії — 401; немає бою — 404; не учасник — 403", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const get = () => GET(new Request("http://x/api?versionOnly=1"), params);

    readDeps.getUserId.mockResolvedValueOnce(null);
    expect((await get()).status).toBe(401);

    readDeps.loadAccess.mockResolvedValueOnce(null);
    expect((await get()).status).toBe(404);

    readDeps.loadAccess.mockResolvedValueOnce({ version: 9, isMember: false });
    expect((await get()).status).toBe(403);
  });
});

describe("GET /battles/[battleId]/events", () => {
  it("сторінка подій до seq з типовим лімітом", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/events/route");

    const res = await GET(new Request("http://x/api?before=31"), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ events: [{ actionIndex: 1, resultText: "Старт" }], hasMore: false });
    expect(readDeps.loadEventsBefore).toHaveBeenCalledWith("b1", { before: 31, limit: 50 });
  });

  it("невалідні параметри — 400; не учасник — 403 без читання подій", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/events/route");

    expect((await GET(new Request("http://x/api"), params)).status).toBe(400);
    expect((await GET(new Request("http://x/api?before=5&limit=1000"), params)).status).toBe(400);

    readDeps.loadAccess.mockResolvedValueOnce({ version: 9, isMember: false });
    expect((await GET(new Request("http://x/api?before=5"), params)).status).toBe(403);
    expect(readDeps.loadEventsBefore).not.toHaveBeenCalled();
  });
});

describe("GET /battles/[battleId]", () => {
  it("повертає бій у старій формі з журналом з подій, роллю і версією", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await GET(new Request("http://x/api"), params);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ id: "b1", userRole: "player", isDM: false, version: 2 });
    expect(json.battleLog).toEqual([{ actionIndex: 3, resultText: "Удар" }]);
    expect(json.battleLogMode).toBeUndefined();
    expect(deps.loadRecentEvents).toHaveBeenCalledWith("b1", 30);
    expect(deps.saveBattle).not.toHaveBeenCalled();
  });

  it("гравцю віддає підсумок знань; ДМу — ні і не читає його з БД", async () => {
    const knowledge = { x: { ac: { min: 13, max: 15, evidence: [] }, traits: [] } };

    loadKnowledge.mockResolvedValue(knowledge);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    expect((await (await GET(new Request("http://x/api"), params)).json()).knowledge).toEqual(knowledge);

    deps.loadBattle.mockResolvedValue(loaded(true) as never);
    loadKnowledge.mockClear();

    expect((await (await GET(new Request("http://x/api"), params)).json()).knowledge).toBeUndefined();
    expect(loadKnowledge).not.toHaveBeenCalled();
  });

  it("гравець, що бачить HP ворогів (seeEnemyHp), не читає знання з БД", async () => {
    const ability = { key: "k", name: "Пильне око", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "seeEnemyHp" }], source: { type: "skill", id: "s", name: "Пильне око" } };

    const seer = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [ability] } };

    deps.loadBattle.mockResolvedValue({ ...loaded(), participants: [seer, goblin] } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    expect((await (await GET(new Request("http://x/api"), params)).json()).knowledge).toBeUndefined();
    expect(loadKnowledge).not.toHaveBeenCalled();
  });

  it("немає бою — 404; не учасник — 403", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    deps.loadBattle.mockResolvedValueOnce(null);
    expect((await GET(new Request("http://x/api"), params)).status).toBe(404);

    deps.loadBattle.mockResolvedValueOnce({ ...loaded(), isMember: false } as never);
    expect((await GET(new Request("http://x/api"), params)).status).toBe(403);
  });
});

describe("PATCH /battles/[battleId]", () => {
  beforeEach(() => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm" } as never);
    vi.mocked(prisma.battleScene.findUnique).mockResolvedValue({ id: "b1", campaignId: "c1" } as never);
  });

  it("поле поза білим списком — 400, без запису", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await PATCH(new Request("http://x/api", { method: "PATCH", body: JSON.stringify({ status: "completed" }) }), params);

    expect(res.status).toBe(400);
    expect(prisma.battleScene.update).not.toHaveBeenCalled();
  });

  it("name — оновлює лише name", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await PATCH(new Request("http://x/api", { method: "PATCH", body: JSON.stringify({ name: "Нова назва" }) }), params);

    expect(res.status).toBe(200);
    expect(prisma.battleScene.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { name: "Нова назва", version: { increment: 1 } } });
  });

  it("не DM — відповідь requireDM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { PATCH } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await PATCH(new Request("http://x/api", { method: "PATCH", body: JSON.stringify({ name: "x" }) }), params);

    expect(res.status).toBe(403);
  });
});

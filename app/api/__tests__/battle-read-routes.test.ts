import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./battles/fixtures";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { defaultPipelineDeps } from "@/lib/utils/battle/pipeline/default-deps";

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
}));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn(), requireAuth: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } } }));

const params = { params: Promise.resolve({ id: "c1", battleId: "b1" }) };

const deps = vi.mocked(defaultPipelineDeps);

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
    expect(deps.loadRecentEvents).toHaveBeenCalledWith("b1", 100);
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

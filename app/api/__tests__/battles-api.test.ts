import { NextResponse } from "next/server";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { createRequest,getResponseJson, getResponseStatus } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(),
  requireDM: vi.fn(),
  requireCampaignAccess: vi.fn(),
}));

const resolveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/battle-map-storage", () => ({ resolveMapBackgroundForPersistence: resolveMock }));

vi.mock("@/lib/db", () => ({
  prisma: {
    battleScene: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("GET /api/campaigns/[id]/battles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо немає доступу до кампанії", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { GET } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 200 та масив битв при успішному доступі", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      isDM: false,
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });

    const mockBattles = [
      {
        id: "battle-1",
        campaignId: "c1",
        name: "Battle 1",
        description: null,
        status: "prepared",
        participants: [],
        currentRound: 1,
        currentTurnIndex: 0,
        initiativeOrder: [],
        battleLog: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
    ];

    vi.mocked(prisma.battleScene.findMany).mockResolvedValue(mockBattles as never);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response);

    expect(Array.isArray(data)).toBe(true);
    expect((data as { id: string }[])[0].id).toBe("battle-1");

    const select = vi.mocked(prisma.battleScene.findMany).mock.calls[0][0]?.select as Record<string, unknown>;

    expect(select).not.toHaveProperty("initiativeOrder");
    expect(select).not.toHaveProperty("pendingSummons");
  });
});

describe("POST /api/campaigns/[id]/battles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { POST } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles", {
      method: "POST",
      body: JSON.stringify({
        name: "New Battle",
        participants: [{ id: "char-1", type: "character", side: "ally" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 400 при невалідному body (відсутні participants)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      isDM: false,
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });

    const { POST } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles", {
      method: "POST",
      body: JSON.stringify({ name: "Battle" }), // participants missing
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(400);
    consoleErrorSpy.mockRestore();
  });

  it("повертає 200 та створену битву при валідному body", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      isDM: false,
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });

    const created = {
      id: "b-new",
      campaignId: "c1",
      name: "New Battle",
      description: null,
      status: "prepared",
      participants: [{ id: "char-1", type: "character", side: "ally" }],
      currentRound: 1,
      currentTurnIndex: 0,
      initiativeOrder: [],
      battleLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    vi.mocked(prisma.battleScene.create).mockResolvedValue(created as never);

    const { POST } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles", {
      method: "POST",
      body: JSON.stringify({
        name: "New Battle",
        participants: [{ id: "char-1", type: "character", side: "ally" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { id: string; name: string };

    expect(data.id).toBe("b-new");
    expect(data.name).toBe("New Battle");
  });
});

describe("POST /api/campaigns/[id]/battles — map background", () => {
  const dm = { userId: "dm-1", isDM: true, campaign: { id: "c1", maxLevel: 20, xpMultiplier: 2.5, members: [] } };

  async function post(background: string | null) {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm as never);

    const { POST } = await import("@/app/api/campaigns/[id]/battles/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles", {
      method: "POST",
      body: JSON.stringify({ name: "B", participants: [], map: { cols: 10, rows: 10, opacity: 1, background } }),
      headers: { "Content-Type": "application/json" },
    });

    return POST(request, { params: Promise.resolve({ id: "c1" }) });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.battleScene.create).mockResolvedValue({ id: "b" } as never);
    resolveMock.mockReset();
  });

  it("зберігає нормалізований фон", async () => {
    resolveMock.mockResolvedValue({ ok: true, background: "https://s/battle-maps/c1/x.webp" });

    expect(await getResponseStatus(await post("data:image/webp;base64,AAAA"))).toBe(200);
    expect(prisma.battleScene.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ map: expect.objectContaining({ background: "https://s/battle-maps/c1/x.webp" }) }),
    });
  });

  it("помилка завантаження дає 400", async () => {
    resolveMock.mockResolvedValue({ ok: false, message: "Файл завеликий" });

    const res = await post("data:image/webp;base64,AAAA");

    expect(await getResponseStatus(res)).toBe(400);
    expect(await getResponseJson(res)).toEqual({ error: "Файл завеликий" });
    expect(prisma.battleScene.create).not.toHaveBeenCalled();
  });

  it("невалідний рядок фону дає 400 від схеми", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getResponseStatus(await post("javascript:alert(1)"))).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it("локальний фон проходить схему", async () => {
    resolveMock.mockResolvedValue({ ok: true, background: "/battle-maps/nicolas-tomb.webp" });

    expect(await getResponseStatus(await post("/battle-maps/nicolas-tomb.webp"))).toBe(200);
  });
});

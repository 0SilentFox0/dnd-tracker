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
      authUser: { id: "user-1", email: null, user_metadata: null },
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
  });
});

describe("GET /api/campaigns/[id]/battles/[battleId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо немає доступу", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles/b1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", battleId: "b1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 404, якщо битву не знайдено", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });
    vi.mocked(prisma.battleScene.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles/b1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", battleId: "b1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);

    const data = await getResponseJson<{ error: string }>(response);

    expect(data.error).toBe("Not found");
  });

  it("повертає 200 та битву з userRole та isDM при успіху", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "dm" }],
      },
    });

    const mockBattle = {
      id: "b1",
      campaignId: "c1",
      name: "Test Battle",
      description: null,
      status: "active",
      participants: [],
      currentRound: 1,
      currentTurnIndex: 0,
      initiativeOrder: [],
      battleLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      campaign: {
        id: "c1",
        friendlyFire: false,
      },
    };

    vi.mocked(prisma.battleScene.findUnique).mockResolvedValue(mockBattle as never);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/battles/b1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", battleId: "b1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { id: string; userRole: string; isDM: boolean };

    expect(data.id).toBe("b1");
    expect(data.userRole).toBe("dm");
    expect(data.isDM).toBe(true);
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
      authUser: { id: "dm-1", email: null, user_metadata: null },
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
      authUser: { id: "dm-1", email: null, user_metadata: null },
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

import { NextResponse } from "next/server";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { createRequest,getResponseJson, getResponseStatus } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(),
  requireDM: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("GET /api/campaigns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 401, якщо користувач не авторизований", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(401);

    const data = await getResponseJson<{ error: string }>(response);

    expect(data.error).toBe("Unauthorized");
  });

  it("повертає 404, якщо кампанію не знайдено", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
    });
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);

    const data = await getResponseJson<{ error: string }>(response);

    expect(data.error).toBe("Campaign not found");
  });

  it("повертає 403, якщо користувач не учасник кампанії", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
    });
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "c1",
      name: "Test",
      description: null,
      inviteCode: "invite-1",
      dmUserId: "dm-1",
      maxLevel: 20,
      xpMultiplier: 2.5,
      allowPlayerEdit: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      friendlyFire: false,
      members: [], // немає поточного юзера
      dm: { id: "dm-1", email: "dm@test.com", displayName: "DM", avatar: null, createdAt: new Date() },
    } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);

    const data = await getResponseJson<{ error: string }>(response);

    expect(data.error).toBe("Forbidden");
  });

  it("повертає 200 та кампанію, якщо користувач — учасник", async () => {
    const campaignId = "c1";

    vi.mocked(apiAuth.requireAuth).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
    });

    const campaign = {
      id: campaignId,
      name: "Test Campaign",
      description: "Desc",
      inviteCode: "invite-1",
      dmUserId: "dm-1",
      maxLevel: 20,
      xpMultiplier: 2.5,
      allowPlayerEdit: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      friendlyFire: false,
      members: [
        {
          userId: "user-1",
          role: "player",
          id: "m1",
          campaignId,
          joinedAt: new Date(),
          user: { id: "user-1", email: "u@test.com", displayName: "User", avatar: null, createdAt: new Date() },
        },
      ],
      dm: { id: "dm-1", email: "dm@test.com", displayName: "DM", avatar: null, createdAt: new Date() },
    };

    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);

    const { GET } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1");

    const response = await GET(request, {
      params: Promise.resolve({ id: campaignId }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response);

    expect(data).toBeDefined();
    expect((data as { id: string }).id).toBe(campaignId);
    expect((data as { name: string }).name).toBe("Test Campaign");
  });
});

describe("PATCH /api/campaigns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { PATCH } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 200 та оновлену кампанію при успішному PATCH", async () => {
    const campaignId = "c1";

    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: campaignId,
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: campaignId,
      members: [{ userId: "dm-1", role: "dm" }],
    } as never);

    const updated = {
      id: campaignId,
      name: "Updated Name",
      description: null,
      inviteCode: "invite-1",
      dmUserId: "dm-1",
      maxLevel: 20,
      xpMultiplier: 2.5,
      allowPlayerEdit: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      friendlyFire: false,
      members: [{ userId: "dm-1", role: "dm", user: { id: "dm-1", email: "dm@test.com", displayName: "DM", avatar: null, createdAt: new Date() } }],
      dm: { id: "dm-1", email: "dm@test.com", displayName: "DM", avatar: null, createdAt: new Date() },
    };

    vi.mocked(prisma.campaign.update).mockResolvedValue(updated as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/route");

    const request = createRequest("http://localhost/api/campaigns/c1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: campaignId }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response);

    expect((data as { name: string }).name).toBe("Updated Name");
  });
});

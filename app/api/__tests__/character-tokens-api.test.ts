import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() }, characterToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() } } }));

const access = (userId: string, role: "dm" | "player") => ({ userId, isDM: role === "dm", campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });

const post = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/tokens/route");

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

const del = async (tokenId = "t1") => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/tokens/[tokenId]/route");

  return mod.DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "camp", characterId: "ch", tokenId }) }) as Promise<NextResponse>;
};

describe("character tokens API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp" } as never);
    vi.mocked(prisma.characterToken.create).mockResolvedValue({ id: "t1", color: "red", label: "Вкрав у торговця", createdAt: new Date("2026-10-09T00:00:00Z") } as never);
  });

  it("гравець-власник POST — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(forbidden() as never);

    expect((await post({ color: "red", label: "x" })).status).toBe(403);
    expect(prisma.characterToken.create).not.toHaveBeenCalled();
  });

  it("ДМ POST — 201, label обрізано, createdBy dm", async () => {
    const res = await post({ color: "red", label: "  Вкрав у торговця  " });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ token: { id: "t1", color: "red", label: "Вкрав у торговця", createdAt: "2026-10-09T00:00:00.000Z" } });
    expect(prisma.characterToken.create).toHaveBeenCalledWith({ data: { characterId: "ch", color: "red", label: "Вкрав у торговця", createdBy: "dm" } });
  });

  it.each([
    ["невідомий колір", { color: "blue", label: "x" }],
    ["порожній label", { color: "red", label: "   " }],
    ["label 121 символ", { color: "red", label: "a".repeat(121) }],
  ])("%s — 400", async (_name, body) => {
    expect((await post(body)).status).toBe(400);
    expect(prisma.characterToken.create).not.toHaveBeenCalled();
  });

  it("герой з іншої кампанії — 404", async () => {
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "other" } as never);

    expect((await post({ color: "red", label: "x" })).status).toBe(404);
  });

  it("DELETE жетона іншого героя — 404", async () => {
    vi.mocked(prisma.characterToken.findUnique).mockResolvedValue({ characterId: "other", character: { campaignId: "camp" } } as never);

    expect((await del()).status).toBe(404);
    expect(prisma.characterToken.delete).not.toHaveBeenCalled();
  });

  it("DELETE свого жетона — 200", async () => {
    vi.mocked(prisma.characterToken.findUnique).mockResolvedValue({ characterId: "ch", character: { campaignId: "camp" } } as never);

    const res = await del();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.characterToken.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});

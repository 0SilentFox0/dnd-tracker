import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findMany: vi.fn() }, artifact: { findMany: vi.fn() } } }));

const get = async () => {
  const mod = await import("@/app/api/campaigns/[id]/characters/roster/route");

  return mod.GET(new Request("http://x"), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

describe("character roster API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u1", isDM: false } as never);
    vi.mocked(prisma.artifact.findMany).mockResolvedValue([{ id: "h1", name: "Шолом" }] as never);
  });

  it("учасник отримує героїв з назвами артефактів", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", name: "Аргон", avatar: "https://x/a.png", type: "player", inventory: { equipped: { helmet: "h1" } } }] as never);

    const res = await get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "a", name: "Аргон", avatar: "https://x/a.png", type: "player", equipped: { helmet: { id: "h1", name: "Шолом" } } }]);
  });

  it("гравець: запит лише type player", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);

    await get();

    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: "player" }) }));
  });

  it("ДМ бачить і NPC: без фільтра за типом", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true } as never);
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);

    await get();

    expect((vi.mocked(prisma.character.findMany).mock.calls[0][0] as { where: object }).where).not.toHaveProperty("type");
  });

  it("у ростері лише активні персонажі", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);

    await get();

    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ campaignId: "camp", status: "active" }) }));
  });

  it("base64-аватар — null", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", name: "A", avatar: "data:image/png;base64,AAAA", type: "player", inventory: null }] as never);

    expect((await (await get()).json())[0].avatar).toBeNull();
  });

  it("герой без інвентарю — порожній equipped", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", name: "A", avatar: null, type: "player", inventory: null }] as never);

    expect((await (await get()).json())[0].equipped).toEqual({});
    expect(prisma.artifact.findMany).not.toHaveBeenCalled();
  });

  it("не учасник — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }) as never);

    expect((await get()).status).toBe(403);
  });
});

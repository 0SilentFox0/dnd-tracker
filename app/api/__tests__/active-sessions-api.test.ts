import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(async () => ({ userId: "u1" })) }));
vi.mock("@/lib/db", () => ({
  prisma: { battleScene: { findMany: vi.fn() }, campaignShow: { findMany: vi.fn() } },
}));

import { GET } from "@/app/api/campaigns/active-battles/route";

describe("GET /api/campaigns/active-battles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.battleScene.findMany).mockResolvedValue([{ id: "b1", campaignId: "c1" }] as never);
    vi.mocked(prisma.campaignShow.findMany).mockResolvedValue([{ campaignId: "c2" }] as never);
  });

  it("без withShows — масив боїв, показів не читає", async () => {
    const res = await GET(new Request("http://x/api/campaigns/active-battles"));

    expect(await res.json()).toEqual([{ id: "b1", campaignId: "c1" }]);
    expect(prisma.campaignShow.findMany).not.toHaveBeenCalled();
  });

  it("withShows=1 — бої і активні покази кампаній користувача", async () => {
    const res = await GET(new Request("http://x/api/campaigns/active-battles?withShows=1"));

    expect(await res.json()).toEqual({ battles: [{ id: "b1", campaignId: "c1" }], shows: [{ campaignId: "c2" }] });
    expect(prisma.campaignShow.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deckId: { not: null }, campaign: { members: { some: { userId: "u1" } } } } }));
  });
});

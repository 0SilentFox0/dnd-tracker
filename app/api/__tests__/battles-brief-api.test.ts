import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findMany: vi.fn() } } }));

const get = async (query: string) => {
  const { GET } = await import("@/app/api/campaigns/[id]/battles/route");

  return GET(new Request(`http://x/api/campaigns/c1/battles${query}`), { params: Promise.resolve({ id: "c1" }) });
};

describe("GET /battles?brief=1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true } as never);
    vi.mocked(prisma.battleScene.findMany).mockResolvedValue([{ id: "b1", name: "Засідка", status: "prepared" }] as never);
  });

  it("лише id/name/status", async () => {
    const res = await get("?brief=1");

    expect(await res.json()).toEqual([{ id: "b1", name: "Засідка", status: "prepared" }]);
    expect(vi.mocked(prisma.battleScene.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1" }, select: { id: true, name: true, status: true } });
  });
});

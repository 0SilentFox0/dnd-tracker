import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRequest } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

const { clearShowBattle, afterCallbacks } = vi.hoisted(() => ({ clearShowBattle: vi.fn(async () => {}), afterCallbacks: [] as (() => unknown)[] }));

vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: (cb: () => unknown) => void afterCallbacks.push(cb) }));

vi.mock("@/lib/server/show/show-store", () => ({ clearShowBattle }));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {
    $transaction: async (callback: (tx: unknown) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }),
    campaignMember: { findUnique: async () => ({ role: "dm" }) },
 battleScene: { findMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() } } }));

const dm = { userId: "dm", isDM: true } as never;

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
});

describe("видалення бою знімає виклик «До бою!»", () => {
  it("DELETE одного бою: clearShowBattle лише для нього, через after()", async () => {
    vi.mocked(prisma.battleScene.findUnique).mockResolvedValue({ id: "b1", version: 0, campaignId: "c1" } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await DELETE(createRequest("http://x/api", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", battleId: "b1" }) });

    expect(res.status).toBe(200);
    expect(clearShowBattle).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    expect(clearShowBattle).toHaveBeenCalledTimes(1);
    expect(clearShowBattle).toHaveBeenCalledWith("c1", "b1");
  });

  it("бій іншої кампанії: 404 і шоу не чіпається", async () => {
    vi.mocked(prisma.battleScene.findUnique).mockResolvedValue({ campaignId: "other" } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const res = await DELETE(createRequest("http://x/api", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", battleId: "b1" }) });

    expect(res.status).toBe(404);
    expect(afterCallbacks).toHaveLength(0);
  });

  it("DELETE усіх боїв: clearShowBattle для кожного видаленого", async () => {
    vi.mocked(prisma.battleScene.findMany).mockResolvedValue([{ id: "b1" }, { id: "b2" }] as never);
    vi.mocked(prisma.battleScene.deleteMany).mockResolvedValue({ count: 2 } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/battles/route");

    const res = await DELETE(createRequest("http://x/api", { method: "DELETE" }), { params: Promise.resolve({ id: "c1" }) });

    expect(res instanceof NextResponse && res.status).toBe(200);
    await afterCallbacks[0]();
    expect(clearShowBattle.mock.calls).toEqual([["c1", "b1"], ["c1", "b2"]]);
  });
});

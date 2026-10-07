import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() } } }));
vi.mock("@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler", async (orig) => ({
  ...(await orig<object>()),
  buildSheetFor: vi.fn().mockResolvedValue({ identity: { name: "Ліра" } }),
}));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", maxLevel: 20, members: [{ userId, role }] } }) as never;

const get = async (characterId = "ch") => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/sheet/route");

  return mod.GET(new Request("http://x"), { params: Promise.resolve({ id: "camp", characterId }) }) as Promise<NextResponse>;
};

describe("GET sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner" } as never);
  });

  it("власник бачить свій лист", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await get()).status).toBe(200);
  });

  it("інший гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("other", "player"));
    expect((await get()).status).toBe(403);
  });

  it("ДМ бачить будь-якого", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect((await get()).status).toBe(200);
  });

  it("персонаж іншої кампанії — 404", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "other", controlledBy: "owner" } as never);
    expect((await get()).status).toBe(404);
  });

  it("відомий доступ сторінки — без повторного запиту членства", async () => {
    const { readCharacterSheet } = await import("@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet");

    const res = await readCharacterSheet({ id: "camp", characterId: "ch", known: { userId: "owner", isDM: false, maxLevel: 20 } });

    expect(res.status).toBe(200);
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
    expect((await readCharacterSheet({ id: "camp", characterId: "ch", known: { userId: "other", isDM: false, maxLevel: 20 } })).status).toBe(403);
  });
});

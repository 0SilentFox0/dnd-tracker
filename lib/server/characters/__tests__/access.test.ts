import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() } } }));

const as = (userId: string, isDM: boolean) => vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId, isDM, campaign: { id: "camp" } } as never);

const status = (r: unknown) => (r instanceof NextResponse ? r.status : 200);

describe("requireCharacterAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner" } as never);
  });

  it("owner and DM pass, another player gets 403", async () => {
    as("owner", false);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(200);

    as("dm", true);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(200);

    as("other", false);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(403);
  });

  it("character of another campaign → 403, missing → 404", async () => {
    as("dm", true);
    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce({ id: "ch", campaignId: "elsewhere", controlledBy: "owner" } as never);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(403);

    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce(null);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(404);
  });

  it("dmOnly asks requireCampaignAccess for a DM", async () => {
    as("dm", true);
    await requireCharacterAccess("camp", "ch", { dmOnly: true });

    expect(apiAuth.requireCampaignAccess).toHaveBeenCalledWith("camp", true);
  });
});

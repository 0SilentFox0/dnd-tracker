import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readDraftPortraits } from "../portraits/read-portraits";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

vi.mock("@/lib/db", () => ({ prisma: { unit: { findMany: vi.fn() } } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));

describe("readDraftPortraits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCampaignAccess).mockResolvedValue({ userId: "u1" } as never);
  });

  it("filters by the campaign race and non-empty avatar, returns only urls", async () => {
    vi.mocked(prisma.unit.findMany).mockResolvedValue([{ avatar: "https://x/a.webp" }, { avatar: null }, { avatar: "https://x/b.webp" }] as never);

    const res = await readDraftPortraits("c1", "Орки");

    expect(await res.json()).toEqual({ portraits: ["https://x/a.webp", "https://x/b.webp"] });
    expect(vi.mocked(prisma.unit.findMany).mock.calls[0][0]).toMatchObject({ where: { avatar: { not: "" }, race: { campaignId: "c1", name: "Орки" } }, take: 50 });
  });

  it("empty race skips the query", async () => {
    const res = await readDraftPortraits("c1", "");

    expect(await res.json()).toEqual({ portraits: [] });
    expect(prisma.unit.findMany).not.toHaveBeenCalled();
  });

  it("passes through an access error", async () => {
    const denied = NextResponse.json({ error: "x" }, { status: 403 });

    vi.mocked(requireCampaignAccess).mockResolvedValue(denied);

    expect(await readDraftPortraits("c1", "Орки")).toBe(denied);
  });
});

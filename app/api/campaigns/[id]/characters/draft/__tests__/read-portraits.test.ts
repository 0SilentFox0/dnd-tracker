import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readDraftPortraits } from "../portraits/read-portraits";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

vi.mock("@/lib/db", () => ({ prisma: { unit: { findMany: vi.fn() }, race: { findMany: vi.fn() } } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));

describe("readDraftPortraits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCampaignAccess).mockResolvedValue({ userId: "u1" } as never);
    vi.mocked(prisma.race.findMany).mockResolvedValue([{ id: "r1", name: "Орки" }, { id: "r2", name: "Люди" }] as never);
  });

  it("filters by the campaign race and non-empty avatar, returns only urls", async () => {
    vi.mocked(prisma.unit.findMany).mockResolvedValue([{ avatar: "https://x/a.webp", raceId: "r1" }, { avatar: null, raceId: "r1" }, { avatar: "https://x/b.webp", raceId: "r1" }] as never);

    const res = await readDraftPortraits("c1", "Орки");

    expect(await res.json()).toEqual({ portraits: ["https://x/a.webp", "https://x/b.webp"] });
    expect(vi.mocked(prisma.race.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", name: "Орки" } });
    expect(vi.mocked(prisma.unit.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", avatar: { not: "" }, raceId: { in: ["r1", "r2"] } }, take: 50 });
  });

  it("no race returns pools for every campaign race, capped per race", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ avatar: `https://x/o${i}.webp`, raceId: "r1" }));

    vi.mocked(prisma.unit.findMany).mockResolvedValue([{ avatar: "https://x/h.webp", raceId: "r2" }, { avatar: null, raceId: "r2" }, ...many] as never);

    const { pools } = await (await readDraftPortraits("c1")).json();

    expect(pools["Люди"]).toEqual(["https://x/h.webp"]);
    expect(pools["Орки"]).toHaveLength(50);
    expect(vi.mocked(prisma.unit.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", avatar: { not: "" } } });
  });

  it("passes through an access error", async () => {
    const denied = NextResponse.json({ error: "x" }, { status: 403 });

    vi.mocked(requireCampaignAccess).mockResolvedValue(denied);

    expect(await readDraftPortraits("c1", "Орки")).toBe(denied);
  });
});

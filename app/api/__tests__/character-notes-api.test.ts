import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn() } } }));

const access = (userId: string, role: "dm" | "player") => ({ userId, isDM: role === "dm", campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const put = async (notes: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/notes/route");

  return mod.PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ notes }) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ campaignId: "camp", controlledBy: "owner" } as never);
    vi.mocked(prisma.character.update).mockImplementation(((args: { data: { notes: string | null } }) => Promise.resolve({ notes: args.data.notes })) as never);
  });

  it("власник зберігає обрізаний текст", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await put("  Купити мотузку  ");

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ notes: "Купити мотузку" });
  });

  it("порожній текст — null", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect(await getResponseJson(await put("   "))).toEqual({ notes: null });
  });

  it("ДМ, який не власник — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect((await put("x")).status).toBe(403);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("понад 5000 символів — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await put("a".repeat(5001))).status).toBe(400);
  });
});

// Domain assertions keep their DB doubles; real shared locking is covered by storage integration.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));

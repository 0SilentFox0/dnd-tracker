import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findMany: vi.fn() } } }));

const list = async (qs = "") => {
  const { listCharacters } = await import("@/app/api/campaigns/[id]/characters/list-characters");

  return listCharacters(new Request(`http://x/api${qs}`), "camp") as Promise<NextResponse>;
};

describe("listCharacters status filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findMany).mockResolvedValue([] as never);
  });

  it("за замовчуванням лише активні", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u", isDM: false } as never);

    await list();

    expect(vi.mocked(prisma.character.findMany).mock.calls[0][0]?.where).toMatchObject({ status: "active" });
  });

  it("чернетки для гравця — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u", isDM: false } as never);

    expect((await list("?status=pending")).status).toBe(403);
    expect(prisma.character.findMany).not.toHaveBeenCalled();
  });

  it("чернетки для DM", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u", isDM: true } as never);

    await list("?status=pending");

    const arg = vi.mocked(prisma.character.findMany).mock.calls[0][0];

    expect(arg?.where).toMatchObject({ status: "pending" });
    expect(arg?.select).toMatchObject({ reviewNote: true });
  });
});

import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRequest, getResponseJson, getResponseStatus } from "./helpers";

import { kvDel } from "@/lib/cache/kv";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/cache/kv", () => ({ kvDel: vi.fn(), kvGet: vi.fn(), kvSet: vi.fn() }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<typeof import("@/lib/cache/tags")>()), invalidateReference: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { delete: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

const call = async () => {
  const { DELETE } = await import("@/app/api/campaigns/[id]/route");

  return DELETE(createRequest("http://localhost/api/campaigns/c1", { method: "DELETE" }), { params: Promise.resolve({ id: "c1" }) });
};

describe("DELETE /api/campaigns/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM видаляє кампанію й скидає кеші", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm-1", isDM: true } as never);
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm-1" }, { userId: "p1" }] as never);

    const response = await call();

    expect(await getResponseStatus(response)).toBe(200);
    expect(await getResponseJson(response)).toEqual({ success: true });
    expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(kvDel).toHaveBeenCalledWith("campaigns:dm-1");
    expect(kvDel).toHaveBeenCalledWith("campaigns:p1");
    expect(invalidateReference).toHaveBeenCalledWith(Object.values(ReferenceKind), "c1");
  });

  it.each([
    [401, "без сесії"],
    [403, "гравець або DM іншої кампанії"],
  ])("повертає %i (%s) і нічого не видаляє", async (status) => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status }));

    const response = await call();

    expect(await getResponseStatus(response)).toBe(status);
    expect(prisma.campaign.delete).not.toHaveBeenCalled();
    expect(kvDel).not.toHaveBeenCalled();
  });
});

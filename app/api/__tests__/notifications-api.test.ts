import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { playerNotification: { findMany: vi.fn(), updateMany: vi.fn() } } }));

const member = { userId: "u1", isDM: false, campaign: { id: "c1", members: [] } } as never;

const list = () => import("@/app/api/campaigns/[id]/notifications/route");

const read = () => import("@/app/api/campaigns/[id]/notifications/read/route");

const ctx = { params: Promise.resolve({ id: "c1" }) };

const post = (body: unknown) => new Request("http://x", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("notifications API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(member);
    vi.mocked(prisma.playerNotification.updateMany).mockResolvedValue({ count: 2 });
  });

  describe("GET", () => {
    it("returns the caller's unread notifications without readAt", async () => {
      vi.mocked(prisma.playerNotification.findMany).mockResolvedValue([
        { id: "n1", type: "item", refId: "a1", href: "/h", createdAt: new Date("2026-10-28T00:00:00Z"), readAt: null },
      ] as never);

      const res = await (await list()).GET(new Request("http://x"), ctx);

      expect(prisma.playerNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", campaignId: "c1", readAt: null }, orderBy: { createdAt: "desc" }, take: 50 }),
      );
      expect(await res.json()).toEqual([{ id: "n1", type: "item", refId: "a1", href: "/h", createdAt: "2026-10-28T00:00:00.000Z" }]);
    });

    it("passes through the access denial", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

      expect((await (await list()).GET(new Request("http://x"), ctx)).status).toBe(403);
      expect(prisma.playerNotification.findMany).not.toHaveBeenCalled();
    });
  });

  describe("POST read", () => {
    it("marks by type", async () => {
      const res = await (await read()).POST(post({ types: ["item"] }), ctx);

      expect(prisma.playerNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", campaignId: "c1", readAt: null, type: { in: ["item"] } },
        data: { readAt: expect.any(Date) },
      });
      expect(await res.json()).toEqual({ count: 2 });
    });

    it("marks by refId", async () => {
      await (await read()).POST(post({ refIds: ["a1"] }), ctx);

      expect(vi.mocked(prisma.playerNotification.updateMany).mock.calls[0][0]?.where).toEqual({
        userId: "u1",
        campaignId: "c1",
        readAt: null,
        refId: { in: ["a1"] },
      });
    });

    it("applies both filters together", async () => {
      await (await read()).POST(post({ types: ["spell"], refIds: ["s1"] }), ctx);

      expect(vi.mocked(prisma.playerNotification.updateMany).mock.calls[0][0]?.where).toMatchObject({
        type: { in: ["spell"] },
        refId: { in: ["s1"] },
      });
    });

    it.each([["{}"], [JSON.stringify({ types: ["bogus"] })], ["{not json"]])("rejects %s with 400", async (body) => {
      expect((await (await read()).POST(post(body), ctx)).status).toBe(400);
      expect(prisma.playerNotification.updateMany).not.toHaveBeenCalled();
    });
  });
});

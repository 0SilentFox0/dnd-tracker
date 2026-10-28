import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { cleanupAssistantData } from "@/lib/server/assistant/cleanup";

vi.mock("@/lib/db", () => ({ prisma: { assistantIntent: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) }, assistantReceipt: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) } } }));

describe("assistant retention", () => {
  it("redacts only old terminal intents, never pending/executing/unknown work", async () => {
    expect(await cleanupAssistantData(new Date("2026-10-25T00:00:00Z"))).toEqual({ expired: 2, redacted: 2, receiptsDeleted: 1 });

    const calls = vi.mocked(prisma.assistantIntent.updateMany).mock.calls;

    expect(calls[0][0]).toMatchObject({ where: { status: "pending", expiresAt: { lte: new Date("2026-10-25T00:00:00Z") } }, data: { status: "expired" } });

    const { where, data } = calls[1][0];

    expect(where).toMatchObject({ status: { in: ["expired", "rejected", "failed", "applied", "stale"] }, updatedAt: { lt: new Date("2026-10-18T00:00:00Z") }, redactedAt: null });
    expect(data).toHaveProperty("redactedAt", new Date("2026-10-25T00:00:00Z"));
    expect(data).not.toHaveProperty("originTokenId");
  });

  it("retains unknown receipts and pending effects instead of enabling blind retries", async () => {
    await cleanupAssistantData(new Date("2026-10-25T00:00:00Z"));
    expect(vi.mocked(prisma.assistantReceipt.deleteMany).mock.calls.at(-1)?.[0]).toMatchObject({ where: { updatedAt: { lt: new Date("2026-07-27T00:00:00Z") }, status: { in: ["applied", "rejected", "expired", "failed", "stale"] }, effectsStatus: "complete" } });
  });
});

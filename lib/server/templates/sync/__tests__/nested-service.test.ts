import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  return { prisma: createScopedDatabase({}) };
});

const invalidate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cache/tags", () => ({ invalidateAllReference: invalidate }));

import { clone, createFakeSyncDb } from "./fake-sync-db";
import { id } from "./helpers";

import { runContentWriteContext } from "@/lib/server/content/write-context";
import { applySource } from "@/lib/server/templates/sync/service";

const actor = { campaignId: id("t"), userId: "dm", isDM: true, via: "session", scopes: null } as const;

describe("source sync under assistant transaction", () => {
  it("keeps invalidation in the outer commit queue", async () => {
    const f = createFakeSyncDb();

    f.addCampaign({ id: id("s"), kind: "template", visibility: "official", credits: "Attribution" });
    await clone(f, id("s"), actor.campaignId);

    const callbacks: Array<() => void> = [];

    invalidate.mockClear();

    const result = await runContentWriteContext(actor.campaignId, f.db, () => applySource(actor, { apply: [], ignore: [] }), callbacks);

    expect(result).toMatchObject({ applied: 0, ignored: 0 });
    expect(f.campaign(actor.campaignId).credits).toBe("Attribution");
    expect(invalidate).not.toHaveBeenCalled();
    for (const callback of callbacks) callback();
    expect(invalidate).toHaveBeenCalledWith(actor.campaignId);
  });

  it("rejects cross-campaign nesting before touching the source", async () => {
    await expect(runContentWriteContext("another", {}, () => applySource(actor, { apply: [], ignore: [] }))).rejects.toMatchObject({ status: 403 });
  });
});

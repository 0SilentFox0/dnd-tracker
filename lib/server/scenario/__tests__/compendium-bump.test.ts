import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  bound: 0,
  dirty: vi.fn(),
  prisma: {
    scenarioPage: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(async () => ({})) },
    compendiumEntry: { count: vi.fn(), deleteMany: vi.fn(async () => ({ count: 0 })) },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: h.prisma }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignRuntimeWrite: async (_id: string, cb: () => unknown) => cb() }));
vi.mock("@/lib/server/content/write-context", () => ({ markContentDirty: h.dirty, afterContentCommit: vi.fn() }));
vi.mock("@/lib/server/assistant/proposal-media", () => ({ pendingSlideUrls: async () => [], discardSlideFiles: async () => {} }));

import { runScenarioOperation } from "@/lib/server/scenario/action-service";
import { sessionDmActor } from "@/lib/utils/api/actor";

const page = { id: "p", campaignId: "c", title: "T", kind: "note", version: 1, content: { legend: [], sections: [] } };

const run = (operation: string, input: Record<string, unknown>) => runScenarioOperation(sessionDmActor("c", "u"), operation, { id: "p", ...input }, undefined, "uk");

describe("scenario writes to compendium-bound pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.prisma.scenarioPage.findFirst.mockResolvedValue(page);
    h.prisma.scenarioPage.update.mockResolvedValue({ ...page, sortOrder: 0, updatedAt: new Date(), createdAt: new Date() });
  });

  it("deleting a bound page marks the content dirty", async () => {
    h.prisma.compendiumEntry.count.mockResolvedValue(1);
    await run("delete", {});
    expect(h.dirty).toHaveBeenCalledOnce();
  });

  it("deleting an ordinary page does not", async () => {
    h.prisma.compendiumEntry.count.mockResolvedValue(0);
    await run("delete", {});
    expect(h.dirty).not.toHaveBeenCalled();
  });

  it("a meta edit of a bound page marks the content dirty", async () => {
    h.prisma.compendiumEntry.count.mockResolvedValue(1);
    await run("meta", { patch: { title: "New" } });
    expect(h.dirty).toHaveBeenCalledOnce();
  });
});

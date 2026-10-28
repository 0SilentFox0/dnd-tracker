import { beforeEach, describe, expect, it, vi } from "vitest";

import { linkLegacyProposal } from "@/lib/server/assistant/legacy-proposals";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ id: "c" }]),
  campaignMember: { findMany: vi.fn(async () => [{ role: "dm" }]) },
  aiProposal: { findFirst: vi.fn() },
  assistantIntent: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: { ...db, $transaction: (f: (t: typeof db) => unknown) => f(db) } }));
vi.mock("@/lib/server/scenario/action-service", () => ({ scenarioResult: (data: unknown) => ({ data }), scenarioState: vi.fn(async () => ({ page: { version: 1, title: "Сцена" } })) }));

const caller = { actor: { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null }, channel: "chat" as const, threadId: null, tokenId: null };

describe("legacy proposal linkage", () => {
  beforeEach(() => { vi.clearAllMocks(); db.assistantIntent.findUnique.mockResolvedValue(null); db.aiProposal.findFirst.mockResolvedValue({ id: "p", pageId: "page", status: "pending", summary: "Правка", ops: [] }); db.assistantIntent.create.mockImplementation(async ({ data }) => ({ ...data, id: "intent" })); });
  it("legacyPendingListedOnce", async () => {
    const first = await linkLegacyProposal(caller, "p");

    const data = db.assistantIntent.create.mock.calls[0][0].data;

    db.assistantIntent.findUnique.mockResolvedValue({ ...data, id: first.id });
    expect(await linkLegacyProposal(caller, "p")).toEqual(first);
    expect(db.assistantIntent.create).toHaveBeenCalledTimes(1);
    expect(data.legacyProposalId).toBe("p");
  });
  it("foreign proposal cannot link", async () => {
    db.aiProposal.findFirst.mockResolvedValue(null);
    await expect(linkLegacyProposal(caller, "foreign")).rejects.toMatchObject({ status: 404 });
  });
  it("token cannot take over a session legacy proposal", async () => {
    await expect(linkLegacyProposal({ ...caller, actor: { ...caller.actor, via: "token", scopes: ["scenario:write"] }, channel: "mcp", tokenId: "t" }, "p")).rejects.toMatchObject({ status: 403 });
  });
});

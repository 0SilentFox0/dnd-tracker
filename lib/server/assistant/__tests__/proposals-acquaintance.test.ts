import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { makeT } from "@/lib/i18n/test/mock-t";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ id: "camp" }]),
  assistantIntent: { findUnique: vi.fn(async () => null) },
  aiProposal: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  scenarioPage: { findFirst: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  campaign: { findUnique: vi.fn(async () => ({ acquaintancesEnabled: true })) },
  acquaintance: { findFirst: vi.fn(async () => null), create: vi.fn(async ({ data }: { data: { id: string } }) => data) },
}));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));
vi.mock("@/lib/server/scenario/versions", () => ({ snapshotIfDue: vi.fn(), pruneVersions: vi.fn() }));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = () => ({ legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: doc("Беатріс тут"), notes: doc("") }] }] });

const proposalOps = () => {
  const r = resolveAiOps(content() as never, [{ op: "createAcquaintance", ref: "b", name: "Беатріс" }, { op: "linkMentions", acquaintance: { ref: "b" }, forms: ["Беатріс"] }], makeT("assistant"));

  if (!r.ok) throw new Error("fixture");

  return r.ops;
};

const run = async () => (await import("@/lib/server/assistant/proposals")).applyProposal("camp", "dm", "pr");

describe("applyProposal with createAcquaintance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.campaign.findUnique.mockResolvedValue({ acquaintancesEnabled: true });
    tx.acquaintance.findFirst.mockResolvedValue(null);
    tx.scenarioPage.updateMany.mockResolvedValue({ count: 1 });
    tx.aiProposal.findFirst.mockResolvedValue({ id: "pr", pageId: "p", status: "pending", ops: proposalOps() });
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 3, content: content() });
  });

  it("creates a micro acquaintance after the page write and substitutes its id into the chip", async () => {
    const res = await run();

    expect(res.ok).toBe(true);

    const created = tx.acquaintance.create.mock.calls[0][0].data as Record<string, unknown>;

    expect(created).toMatchObject({ kind: "micro", name: "Беатріс", sourcePageId: "p", sourceSectionId: "s", campaignId: "camp" });

    const written = JSON.stringify(tx.scenarioPage.updateMany.mock.calls[0]);

    expect(written).toContain(created.id as string);
    expect(written).not.toContain("@ref:");
  });

  it("same name (case-insensitive) reuses the existing acquaintance", async () => {
    tx.acquaintance.findFirst.mockResolvedValue({ id: "existing", name: "беатріс" } as never);

    await run();

    expect(tx.acquaintance.create).not.toHaveBeenCalled();
    expect(JSON.stringify(tx.scenarioPage.updateMany.mock.calls[0])).toContain("existing");
  });

  it("acquaintances disabled -> error key, nothing created or written, claim handed back", async () => {
    tx.campaign.findUnique.mockResolvedValue({ acquaintancesEnabled: false });

    const res = await run();

    expect(res).toEqual({ ok: false, status: 403, error: API_ERRORS.ACQUAINTANCES_DISABLED });
    expect(tx.acquaintance.create).not.toHaveBeenCalled();
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(tx.aiProposal.updateMany).toHaveBeenLastCalledWith({ where: { id: "pr" }, data: { status: "pending" } });
  });

  it("stale page -> stale before any acquaintance is created", async () => {
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 4, content: { ...content(), sections: [{ ...content().sections[0], rows: [{ id: "r", story: doc("Змінено"), notes: doc("") }] }] } });

    const res = await run();

    expect(res).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE });
    expect(tx.acquaintance.create).not.toHaveBeenCalled();
  });

  it("version conflict on the page write -> no acquaintance created", async () => {
    tx.scenarioPage.updateMany.mockResolvedValue({ count: 0 });

    const res = await run();

    expect(res).toMatchObject({ ok: false, status: 409, error: API_ERRORS.SCENARIO_CONFLICT });
    expect(tx.acquaintance.create).not.toHaveBeenCalled();
  });

  it("a failing acquaintance insert propagates so the transaction rolls back", async () => {
    tx.acquaintance.create.mockRejectedValueOnce(new Error("db"));

    await expect(run()).rejects.toThrow("db");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { makeT } from "@/lib/i18n/test/mock-t";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";
import type { RichDoc, RichNode } from "@/types/scenario";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ id: "camp" }]),
  assistantIntent: { findUnique: vi.fn(async () => null) },
  aiProposal: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  scenarioPage: { findFirst: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  campaign: { findUnique: vi.fn(async () => ({ acquaintancesEnabled: true })) },
  acquaintance: { count: vi.fn(async () => 1), findMany: vi.fn(async () => []), create: vi.fn(async ({ data }: { data: { id: string } }) => data) },
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
    tx.acquaintance.findMany.mockResolvedValue([]);
    tx.acquaintance.count.mockResolvedValue(1);
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
    tx.acquaintance.findMany.mockResolvedValue([{ id: "existing", name: "беатріс" }] as never);

    await run();

    expect(tx.acquaintance.create).not.toHaveBeenCalled();
    expect(JSON.stringify(tx.scenarioPage.updateMany.mock.calls[0])).toContain("existing");
  });

  it("linkMentions with an existing id from another campaign -> not found, nothing written", async () => {
    const r = resolveAiOps(content() as never, [{ op: "linkMentions", acquaintance: { id: "foreign" }, forms: ["Беатріс"] }], makeT("assistant"));

    if (!r.ok) throw new Error("fixture");

    tx.aiProposal.findFirst.mockResolvedValue({ id: "pr", pageId: "p", status: "pending", ops: r.ops });
    tx.acquaintance.count.mockResolvedValue(0);

    const res = await run();

    expect(res).toEqual({ ok: false, status: 404, error: API_ERRORS.ACQUAINTANCE_NOT_FOUND });
    expect(tx.acquaintance.count).toHaveBeenCalledWith({ where: { campaignId: "camp", id: { in: ["foreign"] } } });
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  const chip = (id: string): RichNode => ({ type: "mention", attrs: { id, label: "Беатріс", type: "acquaintance" } });

  const chipDoc = (id: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [chip(id)] }] });

  const withOps = (ops: unknown[]) => tx.aiProposal.findFirst.mockResolvedValue({ id: "pr", pageId: "p", status: "pending", ops });

  it("a chip already in the row (acquaintance since deleted) is not re-validated", async () => {
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 3, content: { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: chipDoc("gone"), notes: doc("") }] }] } });
    withOps([{ op: "replaceRow", sectionId: "s", rowId: "r", story: { type: "doc", content: [{ type: "paragraph", content: [chip("gone"), { type: "text", text: " ще" }] }] }, before: { story: chipDoc("gone"), notes: doc("") } }]);
    tx.acquaintance.count.mockResolvedValue(0);

    expect((await run()).ok).toBe(true);
    expect(tx.acquaintance.count).not.toHaveBeenCalled();
  });

  it("insertRow and addSection with a foreign chip -> not found", async () => {
    tx.acquaintance.count.mockResolvedValue(0);

    withOps([{ op: "insertRow", sectionId: "s", afterRowId: null, row: { id: "n", story: chipDoc("foreign"), notes: doc("") } }]);
    expect(await run()).toEqual({ ok: false, status: 404, error: API_ERRORS.ACQUAINTANCE_NOT_FOUND });

    withOps([{ op: "addSection", afterSectionId: null, section: { id: "n", title: "N", played: false, rows: [{ id: "nr", story: doc(""), notes: chipDoc("foreign") }] } }]);
    expect(await run()).toEqual({ ok: false, status: 404, error: API_ERRORS.ACQUAINTANCE_NOT_FOUND });
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("an unresolved @ref placeholder rejects the proposal instead of leaving it pending", async () => {
    withOps([{ op: "replaceRow", sectionId: "s", rowId: "r", story: chipDoc("@ref:zz"), before: { story: doc("Беатріс тут"), notes: doc("") } }]);

    expect(await run()).toEqual({ ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID });
    expect(tx.aiProposal.update).toHaveBeenCalledWith({ where: { id: "pr" }, data: { status: "rejected" } });
    expect(tx.aiProposal.updateMany).not.toHaveBeenLastCalledWith({ where: { id: "pr" }, data: { status: "pending" } });
  });

  it("source section of a new acquaintance is the section of its own chip", async () => {
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 3, content: { legend: [], sections: [{ id: "a", title: "A", played: false, rows: [{ id: "x", story: doc("нічого"), notes: doc("") }] }, ...content().sections] } });

    await run();

    expect(tx.acquaintance.create.mock.calls[0][0].data).toMatchObject({ sourceSectionId: "s" });
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

  it("a ref placeholder on a stale page is stale, not rejected", async () => {
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 4, content: { ...content(), sections: [{ ...content().sections[0], rows: [{ id: "r", story: doc("Змінено"), notes: doc("") }] }] } });
    withOps([{ op: "replaceRow", sectionId: "s", rowId: "r", story: chipDoc("@ref:zz"), before: { story: doc("Беатріс тут"), notes: doc("") } }]);

    expect(await run()).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE });
    expect(tx.aiProposal.update).toHaveBeenCalledWith({ where: { id: "pr" }, data: { status: "stale" } });
  });

  it("a stale proposal with createAcquaintance creates no acquaintance and writes no page", async () => {
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 4, content: { ...content(), sections: [{ ...content().sections[0], rows: [{ id: "r", story: doc("Змінено"), notes: doc("") }] }] } });

    expect((await run()).ok).toBe(false);
    expect(tx.acquaintance.create).not.toHaveBeenCalled();
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(tx.aiProposal.update).toHaveBeenCalledWith({ where: { id: "pr" }, data: { status: "stale" } });
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

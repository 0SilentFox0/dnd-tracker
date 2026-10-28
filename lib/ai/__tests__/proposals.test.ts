import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ id: "camp" }]),
  assistantIntent: { findUnique: vi.fn(async () => null) },
  aiProposal: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  scenarioPage: { findFirst: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));
vi.mock("@/lib/server/scenario/versions", () => ({ snapshotIfDue: vi.fn(), pruneVersions: vi.fn() }));
vi.mock("@/lib/utils/scenario/ai-ops", () => ({ applyAiOps: vi.fn() }));

const content = { legend: [], sections: [] };

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("applyProposal", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    tx.aiProposal.findFirst.mockResolvedValue({ id: "pr", pageId: "p", status: "pending", ops: [] });
    tx.scenarioPage.findFirst.mockResolvedValue({ id: "p", title: "T", version: 3, content });
  });

  const run = async (applied: unknown) => {
    const { applyAiOps } = await import("@/lib/utils/scenario/ai-ops");

    vi.mocked(applyAiOps).mockReturnValue({ ok: true, content: applied } as never);

    const { applyProposal } = await import("@/lib/ai/proposals");

    return applyProposal("camp", "dm", "pr");
  };

  it("завеликий результат → 413, нічого не пишеться, пропозиція лишається pending", async () => {
    const big = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: doc("x".repeat(600_000)), notes: doc("") }] }] };

    const res = await run(big);

    expect(res).toEqual({ ok: false, status: 413, error: API_ERRORS.SCENARIO_TOO_LARGE });
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(tx.aiProposal.update).not.toHaveBeenCalled();
  });

  it("невалідний результат → 400, нічого не пишеться, пропозиція лишається pending", async () => {
    const res = await run({ sections: "oops" });

    expect(res).toEqual({ ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID });
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(tx.aiProposal.update).not.toHaveBeenCalled();
  });

  it("паралельне застосування: програвший claim → 409, сторінка не пишеться", async () => {
    tx.aiProposal.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await run(content);

    expect(res).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE });
    expect(tx.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("невдалий запис повертає claim у pending", async () => {
    await run({ sections: "oops" });

    expect(tx.aiProposal.updateMany).toHaveBeenLastCalledWith({ where: { id: "pr" }, data: { status: "pending" } });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findFirst: vi.fn() }, aiProposal: { create: vi.fn() } } }));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const ctx = { campaignId: "camp1", userId: "dm", scopes: ["ai"] as const, threadId: "t1" };

describe("propose_scenario_edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("a"), notes: doc("") }] }] } } as never);
    vi.mocked(prisma.aiProposal.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "ap1", ...data, status: "pending", appliedVersion: null, createdAt: new Date() })) as never);
  });

  it("створює pending-пропозицію з threadId і before", async () => {
    const { proposeScenarioEditTool } = await import("@/lib/ai/tools/propose");

    expect(await proposeScenarioEditTool.handler(ctx, { pageId: "p1", summary: "Похмуріше", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "b" }] })).toMatchObject({ proposalId: "ap1" });

    const data = vi.mocked(prisma.aiProposal.create).mock.calls[0][0].data as unknown as Record<string, unknown> & { ops: { before: unknown }[] };

    expect(data).toMatchObject({ campaignId: "camp1", threadId: "t1", pageId: "p1" });
    expect(data.ops[0].before).toEqual({ story: doc("a"), notes: doc("") });
  });

  it("невідомий рядок — AiToolError, нічого не створено", async () => {
    const { proposeScenarioEditTool } = await import("@/lib/ai/tools/propose");

    await expect(proposeScenarioEditTool.handler(ctx, { pageId: "p1", summary: "x", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "zz", story: "b" }] })).rejects.toThrow("zz");
    expect(prisma.aiProposal.create).not.toHaveBeenCalled();
  });
});

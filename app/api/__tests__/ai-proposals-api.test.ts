import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => {
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: "camp" }]),
    assistantIntent: { findUnique: vi.fn(async () => null) },
    aiProposal: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    scenarioPage: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  };

  return { prisma: { ...tx, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("Дзвони"), notes: doc("") }] }] };

const page = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 3, updatedAt: new Date(), content, ...over });

const ops = () => {
  const r = resolveAiOps(content as never, [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Дзвони гудуть" }]);

  if (!r.ok) throw new Error(r.error);

  return r.ops;
};

const proposal = (over: Record<string, unknown> = {}) => ({ id: "ap1", pageId: "p1", threadId: "t1", summary: "s", ops: ops(), status: "pending", appliedVersion: null, createdAt: new Date(), ...over });

const params = { params: Promise.resolve({ id: "camp1", proposalId: "ap1" }) } as never;

const apply = async () => (await import("@/app/api/campaigns/[id]/ai/proposals/[proposalId]/apply/route")).POST(new Request("http://x", { method: "POST" }), params);

describe("AI proposals API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(proposal() as never);
    vi.mocked(prisma.aiProposal.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(page() as never);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page() as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("review and apply do not require AI_KEYS_SECRET", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");
    expect((await apply()).status).toBe(200);

    const { listProposalsHandler } = await import("@/app/api/campaigns/[id]/ai/ai-handlers");

    vi.mocked(prisma.aiProposal.findMany).mockResolvedValue([]);
    expect((await listProposalsHandler(new Request("http://x"), "camp1")).status).toBe(200);
  });

  it("keyless reject remains available while paid generation remains guarded", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");
    vi.mocked(prisma.aiProposal.findUnique).mockResolvedValue(proposal({ status: "rejected" }) as never);

    const { rejectProposalHandler, generateSlideImageHandler } = await import("@/app/api/campaigns/[id]/ai/ai-handlers");

    expect((await rejectProposalHandler("camp1", "ap1")).status).toBe(200);
    expect((await generateSlideImageHandler(new Request("http://x", { method: "POST" }), "camp1")).status).toBe(503);
  });

  it("не DM — 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await apply()).status).toBe(403);
  });

  it("apply: знімок версії ДО правки, version+1, статус applied", async () => {
    const res = await apply();

    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe(4);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalled();
    expect(vi.mocked(prisma.scenarioPageVersion.create).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.scenarioPage.updateMany).mock.invocationCallOrder[0]);
    expect(vi.mocked(prisma.scenarioPage.updateMany).mock.calls[0][0]).toMatchObject({ where: { id: "p1", version: 3 } });
    expect(vi.mocked(prisma.aiProposal.update).mock.calls[0][0]).toMatchObject({ data: { status: "applied", appliedVersion: 4 } });
  });

  it("рядок змінено — 409 stale, сторінка не змінена", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(page({ content: { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: doc("Дзвони!"), notes: doc("") }] }] } }) as never);

    const res = await apply();

    expect(res.status).toBe(409);
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.aiProposal.update).mock.calls[0][0]).toMatchObject({ data: { status: "stale" } });
  });

  it("повторний apply — 409 «вже застосовано», сторінка не змінена", async () => {
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(proposal({ status: "applied", appliedVersion: 4 }) as never);

    const res = await apply();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Пропозицію вже застосовано або відхилено");
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("сторінки немає — 404, статус лишається pending", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    expect((await apply()).status).toBe(404);
    expect(prisma.aiProposal.update).not.toHaveBeenCalled();
    expect(prisma.aiProposal.updateMany).toHaveBeenLastCalledWith({ where: { id: "ap1" }, data: { status: "pending" } });
  });

  it("чужа кампанія — 404", async () => {
    vi.mocked(prisma.aiProposal.findFirst).mockResolvedValue(null);

    expect((await apply()).status).toBe(404);
  });

  it("GET ?summary=1 вибирає лише id і status, без ops", async () => {
    vi.mocked(prisma.aiProposal.findMany).mockResolvedValue([{ id: "ap1", status: "pending" }] as never);

    const { GET } = await import("@/app/api/campaigns/[id]/ai/proposals/route");

    const res = await GET(new Request("http://x?pageId=p1&status=pending&summary=1"), { params: Promise.resolve({ id: "camp1" }) } as never);

    expect(await res.json()).toEqual([{ id: "ap1", status: "pending" }]);
    expect(vi.mocked(prisma.aiProposal.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp1", pageId: "p1", status: "pending" }, select: { id: true, status: true } });
  });
});

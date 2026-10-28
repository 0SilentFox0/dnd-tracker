import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as preloadedModule0 from "@/app/api/campaigns/[id]/ai/settings/route";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }), campaign: { findUnique: vi.fn(), update: vi.fn() } } }));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = () => ({ params: Promise.resolve({ id: "camp1" }) }) as never;

describe("AI settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.campaign.update).mockImplementation((async ({ data }: { data: { aiInstructions: string | null } }) => ({ aiInstructions: data.aiInstructions })) as never);
  });

  it("не-ДМ — 403 (GET і PUT)", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const { GET, PUT } = preloadedModule0;

    expect((await GET(req("GET"), params())).status).toBe(403);
    expect((await PUT(req("PUT", { instructions: "a" }), params())).status).toBe(403);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("GET повертає збережене значення", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ aiInstructions: "Темне фентезі" } as never);

    const { GET } = preloadedModule0;

    const res = await GET(req("GET"), params());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ instructions: "Темне фентезі" });
    expect(prisma.campaign.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: { aiInstructions: true } }));
  });

  it("PUT обрізає пробіли і зберігає", async () => {
    const { PUT } = preloadedModule0;

    const res = await PUT(req("PUT", { instructions: "  Говори архаїчно \n" }), params());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ instructions: "Говори архаїчно" });
    expect(prisma.campaign.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "camp1" }, data: { aiInstructions: "Говори архаїчно" } }));
  });

  it("PUT лише з пробілів зберігає null", async () => {
    const { PUT } = preloadedModule0;

    const res = await PUT(req("PUT", { instructions: "  \n " }), params());

    expect(await res.json()).toEqual({ instructions: null });
    expect(prisma.campaign.update).toHaveBeenCalledWith(expect.objectContaining({ data: { aiInstructions: null } }));
  });

  it("PUT понад 8000 — 400", async () => {
    const { PUT } = preloadedModule0;

    expect((await PUT(req("PUT", { instructions: "a".repeat(8001) }), params())).status).toBe(400);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});

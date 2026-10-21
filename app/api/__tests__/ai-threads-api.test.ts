import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    aiThread: { findMany: vi.fn(async () => []), create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    aiMessage: { findMany: vi.fn(async () => []) },
    aiCredential: { findUnique: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const req = (method: string, body?: unknown, url = "http://x") => new Request(url, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

const threadRow = (over: Record<string, unknown> = {}) => ({ id: "t1", campaignId: "camp1", userId: "dm", mode: "live", scenarioPageId: "p1", title: "Новий тред", provider: "anthropic", model: "claude-haiku-4-5-20251001", createdAt: new Date(), updatedAt: new Date(), ...over });

describe("AI threads API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.aiThread.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => threadRow(data)) as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("гравець — 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const { GET } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    expect((await GET(req("GET"), params())).status).toBe(403);
  });

  it("POST live без моделі — fast-модель провайдера", async () => {
    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    const res = await POST(req("POST", { mode: "live", scenarioPageId: "p1", provider: "anthropic" }), params());

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.aiThread.create).mock.calls[0][0].data).toMatchObject({ campaignId: "camp1", userId: "dm", model: "claude-haiku-4-5-20251001" });
  });

  it("POST з defaultModel ключа — бере його", async () => {
    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue({ defaultModel: "claude-opus-5-5" } as never);

    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    await POST(req("POST", { mode: "live", provider: "anthropic" }), params());
    expect(vi.mocked(prisma.aiThread.create).mock.calls[0][0].data).toMatchObject({ model: "claude-opus-5-5" });
  });

  it("POST зі сторінкою іншої кампанії — 404", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    const { POST } = await import("@/app/api/campaigns/[id]/ai/threads/route");

    expect((await POST(req("POST", { mode: "scenario", scenarioPageId: "foreign", provider: "anthropic" }), params())).status).toBe(404);
  });

  it("PATCH невідомої моделі — 400", async () => {
    vi.mocked(prisma.aiThread.findFirst).mockResolvedValue(threadRow() as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/ai/threads/[threadId]/route");

    expect((await PATCH(req("PATCH", { model: "gpt-x" }), params({ threadId: "t1" }))).status).toBe(400);
  });

  it("чужий тред — 404 на повідомлення", async () => {
    vi.mocked(prisma.aiThread.findFirst).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/ai/threads/[threadId]/messages/route");

    expect((await GET(req("GET"), params({ threadId: "t9" }))).status).toBe(404);
  });
});

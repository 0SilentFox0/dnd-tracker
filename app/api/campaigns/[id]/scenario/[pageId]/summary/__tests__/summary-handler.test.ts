import { NextResponse } from "next/server";
import { APICallError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateSummaryHandler } from "../summary-handler";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

const h = vi.hoisted(() => ({
  generate: vi.fn(),
  configured: vi.fn(),
  pick: vi.fn(),
  loadRow: vi.fn(),
  upsert: vi.fn(),
  limit: vi.fn(),
}));

const KEY = "sk-secret-key-123";

vi.mock("server-only", () => ({}));
vi.mock("ai", async (orig) => ({ ...(await orig<object>()), generateObject: h.generate }));
vi.mock("@/lib/ai/crypto", () => ({ isAiConfigured: h.configured }));
vi.mock("@/lib/ai/dm-model", () => ({ pickDmSmartTextModel: h.pick }));
vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findUnique: vi.fn() } } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/utils/api/rate-limit", () => ({ checkRateLimit: h.limit, rateLimitResponse: () => NextResponse.json({ error: "rl" }, { status: 429 }) }));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: async () => "en" }));
vi.mock("@/lib/server/scenario/summary-store", () => ({ loadSummaryRow: h.loadRow, upsertSummary: h.upsert }));
vi.mock("@/lib/ai/chat/run-chat", () => ({ runChat: vi.fn() }));
vi.mock("@/lib/server/assistant/proposals", () => ({}));
vi.mock("@/lib/server/assistant/runs", () => ({}));
vi.mock("@/lib/server/assistant/caller", () => ({}));
vi.mock("@/lib/ai/images", () => ({ AiImageError: class extends Error {}, generateSlideImage: vi.fn() }));
vi.mock("@/lib/ai/generated-images", () => ({}));
vi.mock("@/lib/ai/threads", () => ({}));
vi.mock("@/lib/ai/settings", () => ({}));
vi.mock("@/lib/ai/recovered-state", () => ({}));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: text ? [{ type: "text", text }, { type: "mention", attrs: { type: "unit", id: "u9", label: "Ghost" } }] : [] }] });

const content = (text: string) => ({ legend: [], sections: [{ id: "s1", title: "Intro", played: false, rows: [{ id: "r1", story: doc(text), notes: doc("") }] }] });

const page = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "c1", version: 3, title: "Cave", kind: "scene", arc: null, content: content("The party enters the cave."), ...over });

const generated = { overview: "o", events: ["e"], secrets: [], entities: ["unit:u9", "npc:unknown"], digest: "d" };

const post = (body?: unknown) => generateSummaryHandler(new Request("http://x", { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }), "c1", "p1");

describe("generateSummaryHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.configured.mockReturnValue(true);
    h.pick.mockResolvedValue({ model: {}, provider: "anthropic", modelId: "m1" });
    h.loadRow.mockResolvedValue(null);
    h.limit.mockResolvedValue({ allowed: true });
    h.generate.mockResolvedValue({ object: generated, usage: { inputTokens: 10, outputTokens: 5 } });
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u1", isDM: true } as never);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page() as never);
  });

  it("player gets 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post()).status).toBe(403);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("page of another campaign gets 403", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page({ campaignId: "other" }) as never);

    expect((await post()).status).toBe(403);
  });

  it("missing page gets 404", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(null);

    expect((await post()).status).toBe(404);
  });

  it("503 without AI secret", async () => {
    h.configured.mockReturnValue(false);

    expect((await post()).status).toBe(503);
  });

  it("400 AI_KEY_MISSING without a key", async () => {
    h.pick.mockResolvedValue(null);

    const res = await post();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.AI_KEY_MISSING);
  });

  it("empty page gets 400 AI_SUMMARY_EMPTY and no model call", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page({ content: content("") }) as never);

    const res = await post();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.AI_SUMMARY_EMPTY);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("stores the row and drops unknown entity keys", async () => {
    const res = await post();

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ version: 3, stale: false });
    expect(json.summary.entities).not.toContain("npc:unknown");
    expect(h.upsert).toHaveBeenCalledWith(expect.objectContaining({ pageId: "p1", campaignId: "c1", version: 3, provider: "anthropic", model: "m1", inputTokens: 10, outputTokens: 5 }));
  });

  it("second post at the same version reuses the stored row; force regenerates", async () => {
    await post();
    h.loadRow.mockResolvedValue({ version: 3, summary: { ...generated, entities: [] }, model: "m1", createdAt: new Date() });

    const cached = await post();

    expect(cached.status).toBe(200);
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(h.limit).toHaveBeenCalledTimes(1);

    await post({ force: true });

    expect(h.generate).toHaveBeenCalledTimes(2);
  });

  it("rate limit blocks before the model", async () => {
    h.limit.mockResolvedValue({ allowed: false });

    expect((await post()).status).toBe(429);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("provider error gives 502 without leaking the key", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    h.generate.mockRejectedValue(new APICallError({ message: `bad ${KEY}`, url: `https://x?key=${KEY}`, requestBodyValues: { key: KEY }, statusCode: 500 }));

    const res = await post();

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain(KEY);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(KEY);
    expect(h.upsert).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("saves with the version read before generation", async () => {
    h.generate.mockImplementation(async () => {
      vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(page({ version: 4 }) as never);

      return { object: generated, usage: {} };
    });

    const res = await post();

    expect((await res.json()).version).toBe(3);
    expect(h.upsert).toHaveBeenCalledWith(expect.objectContaining({ version: 3, inputTokens: null, outputTokens: null }));
  });
});

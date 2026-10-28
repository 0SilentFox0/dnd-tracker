import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as preloadedModule0 from "@/app/api/campaigns/[id]/decks/generate-image/route";
import { API_ERRORS } from "@/lib/constants/api-errors";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/ai/crypto", () => ({ isAiConfigured: () => true }));
vi.mock("@/lib/ai/credentials", () => ({ loadApiKey: vi.fn(async () => null) }));
vi.mock("@/lib/ai/settings", () => ({ getAiSettings: vi.fn(), saveAiSettings: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

const body = { prompt: "Таверна", provider: "openai", model: "gpt-image-2", aspect: "16:9", useCampaignStyle: false };

const post = async (b: unknown) => {
  const { POST } = preloadedModule0;

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), { params: Promise.resolve({ id: "c1" }) });
};

describe("POST /decks/generate-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u1", isDM: true } as never);
  });

  it("не ДМ — 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post(body)).status).toBe(403);
  });

  it("невідома модель — 400 AI_MODEL_UNKNOWN", async () => {
    const res = await post({ ...body, model: "gpt-5.5" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.AI_MODEL_UNKNOWN);
  });

  it("anthropic не має моделей зображень — 400", async () => {
    expect((await post({ ...body, provider: "anthropic", model: "claude-opus-5-5" })).status).toBe(400);
  });

  it("немає ключа — 400 AI_KEY_MISSING", async () => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.AI_KEY_MISSING);
  });
});

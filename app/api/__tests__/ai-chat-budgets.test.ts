import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/campaigns/[id]/ai/threads/[threadId]/chat/route";
import { runChat } from "@/lib/ai/chat/run-chat";
import { AI_RATE_LIMITS } from "@/lib/constants/ai";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm" })) }));
vi.mock("@/lib/ai/crypto", () => ({ isAiConfigured: () => true }));
vi.mock("@/lib/ai/chat/run-chat", () => ({ runChat: vi.fn(async () => new Response("ok")) }));
vi.mock("@/lib/redis", () => ({ getRedisClient: () => null }));

const params = Promise.resolve({ id: "campaign", threadId: "thread" });

const chunked = (text: string) => {
  const bytes = new TextEncoder().encode(text);

  let offset = 0;

  return new Request("http://local/chat", {
    method: "POST",
    body: new ReadableStream({
      pull(c) {
        if (offset >= bytes.length) return c.close();

        c.enqueue(bytes.slice(offset, offset + 8192));
        offset += 8192;
      },
    }),
    duplex: "half",
  } as RequestInit);
};

const payload = (size: number, requestId = "r1") => JSON.stringify({ requestId, text: "x".repeat(size) });

describe("assistant chat budgets", () => {
  it("70 KiB із Content-Length — 413", async () => {
    const res = await POST(new Request("http://local/chat", { method: "POST", body: payload(70 * 1024) }), { params });

    expect(res.status).toBe(413);
  });

  it("70 KiB без Content-Length — 413", async () => {
    expect((await POST(chunked(payload(70 * 1024)), { params })).status).toBe(413);
  });

  it("60 KiB валідного JSON доходить до Zod", async () => {
    const res = await POST(new Request("http://local/chat", { method: "POST", body: `${JSON.stringify({ requestId: "r1", text: "x".repeat(8000) })}${" ".repeat(52 * 1024)}` }), { params });

    expect(res.status).toBe(200);
    expect(runChat).toHaveBeenCalled();
  });

  it("21-й запит за 60 с — 429 з Retry-After", async () => {
    const statuses: number[] = [];

    for (let i = 0; i < AI_RATE_LIMITS.chat.limit + 1; i++) {
      statuses.push((await POST(new Request("http://local/chat", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "rate-camp", threadId: "thread" }) })).status);
    }

    expect(statuses.slice(0, -1).every((s) => s !== 429)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

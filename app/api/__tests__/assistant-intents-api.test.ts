import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { assistantRoute } from "@/lib/server/assistant/http";
import { ContentError } from "@/lib/server/content/errors";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), dm: vi.fn(), list: vi.fn(), detail: vi.fn(), confirm: vi.fn(), reject: vi.fn(), deletion: vi.fn(), receipt: vi.fn(),
  tokenUpdate: vi.fn(), threadUpdate: vi.fn(), rate: vi.fn(),
}));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: mocks.dm, requireAuth: mocks.auth }));
vi.mock("@/lib/server/assistant/intent-store", () => ({ listIntents: mocks.list, getIntent: mocks.detail }));
vi.mock("@/lib/server/assistant/execute", () => ({ confirmIntent: mocks.confirm, rejectIntent: mocks.reject }));
vi.mock("@/lib/server/assistant/receipts", () => ({ readReceipt: mocks.receipt, readDeletionReceipt: mocks.deletion }));
vi.mock("@/lib/db", () => ({ prisma: { apiToken: { updateMany: mocks.tokenUpdate }, aiThread: { updateMany: mocks.threadUpdate } } }));
vi.mock("@/lib/utils/api/rate-limit", () => ({ checkRateLimit: mocks.rate, rateLimitResponse: () => NextResponse.json({ code: "RATE_LIMITED" }, { status: 429 }) }));

const ctx = () => ({ params: Promise.resolve({ id: "campaign", intentId: "intent" }) });

const req = (method = "GET", body?: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:3123/api/campaigns/campaign/assistant/intents/intent", {
  method, headers: { host: "localhost:3123", ...(method !== "GET" && { origin: "http://localhost:3123" }), ...headers }, ...(body !== undefined && { body: JSON.stringify(body) }),
});

describe("assistant human-only API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", "");
    mocks.auth.mockResolvedValue({ userId: "dm" });
    mocks.dm.mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "campaign" } });
    mocks.list.mockResolvedValue({ items: [], nextCursor: null });
    mocks.detail.mockResolvedValue({ id: "intent", status: "pending", preview: { summary: "Preview" } });
    mocks.confirm.mockResolvedValue({ id: "receipt", status: "applied", effectsStatus: "complete" });
    mocks.tokenUpdate.mockResolvedValue({ count: 0 });
    mocks.threadUpdate.mockResolvedValue({ count: 1 });
    mocks.rate.mockResolvedValue({ allowed: true });
    mocks.deletion.mockRejectedValue(new ContentError("Not found", 404));
  });

  it("players cannot read or confirm even without an AI key", async () => {
    mocks.dm.mockResolvedValue(NextResponse.json({ code: "FORBIDDEN" }, { status: 403 }));
    expect((await assistantRoute("list")(req(), ctx())).status).toBe(403);
    expect((await assistantRoute("confirm")(req("POST"), ctx())).status).toBe(403);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("Bearer cannot confirm or set auto even with a valid cookie session", async () => {
    for (const mode of ["confirm", "policy"] as const) {
      expect((await assistantRoute(mode)(req(mode === "policy" ? "PUT" : "POST", undefined, { authorization: "Bearer dndt_test" }), ctx())).status).toBe(403);
    }
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.threadUpdate).not.toHaveBeenCalled();
  });

  it("cross-origin or missing Origin mutations are rejected, forwarded-host is ignored", async () => {
    expect((await assistantRoute("confirm")(req("POST", undefined, { origin: "https://evil.invalid", "x-forwarded-host": "evil.invalid" }), ctx())).status).toBe(403);

    const missing = req("POST");

 missing.headers.delete("origin");
    expect((await assistantRoute("confirm")(missing, ctx())).status).toBe(403);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("DM review works without AI_KEYS_SECRET and all responses are private/no-store", async () => {
    const list = await assistantRoute("list")(req(), ctx());

    const detail = await assistantRoute("detail")(req(), ctx());

    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(detail.headers.get("cache-control")).toBe("private, no-store");
    expect(await detail.json()).toMatchObject({ id: "intent" });
  });

  it("forwards the real session actor, never a user id supplied by the request", async () => {
    const result = await assistantRoute("confirm")(req("POST", { userId: "another-dm" }), ctx());

    expect(result.status).toBe(200);
    expect(mocks.confirm).toHaveBeenCalledWith({ campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, "intent", "uk");
  });

  it("foreign author/expired intent errors preserve 404/409 without leaking payload", async () => {
    for (const status of [404, 409]) {
      mocks.confirm.mockRejectedValueOnce(new ContentError("Пропозиція недоступна", status));

      const result = await assistantRoute("confirm")(req("POST"), ctx());

      expect(result.status).toBe(status);
      expect(result.headers.get("cache-control")).toBe("private, no-store");
    }
    mocks.confirm.mockRejectedValueOnce(new Error("private SQL/payload"));

    const error = await assistantRoute("confirm")(req("POST"), ctx());

    expect(error.status).toBe(500);
    expect(JSON.stringify(await error.json())).not.toContain("private SQL");
  });

  it("policy update is scoped to the current DM's thread/token", async () => {
    const result = await assistantRoute("policy")(req("PUT", { target: "token", id: "foreign", executionMode: "auto" }), ctx());

    expect(result.status).toBe(404);
    expect(mocks.tokenUpdate).toHaveBeenCalledWith({ where: { id: "foreign", campaignId: "campaign", userId: "dm", revokedAt: null }, data: { executionMode: "auto" } });

    const own = await assistantRoute("policy")(req("PUT", { target: "thread", id: "thread", executionMode: "auto" }), ctx());

    expect(own.status).toBe(200);
    expect(await own.json()).toEqual({ id: "thread", executionMode: "auto" });
  });

  it("malformed policy is rejected before any update", async () => {
    const result = await assistantRoute("policy")(req("PUT", { target: "thread", id: "thread", executionMode: "unsafe", userId: "other" }), ctx());

    expect(result.status).toBe(400);
    expect(mocks.threadUpdate).not.toHaveBeenCalled();
  });

  it("rate limiting returns private 429 before execution", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });

    const response = await assistantRoute("confirm")(req("POST"), ctx());

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("minimal own deletion receipt remains available after campaign removal", async () => {
    mocks.deletion.mockResolvedValue({ id: "receipt", status: "applied", deleted: true });
    mocks.dm.mockResolvedValue(NextResponse.json({}, { status: 404 }));

    const response = await assistantRoute("receipt")(req(), ctx());

    expect(response.status).toBe(200);
    expect(mocks.deletion).toHaveBeenCalledWith("dm", "campaign", "intent");
    expect(mocks.dm).not.toHaveBeenCalled();
  });
});

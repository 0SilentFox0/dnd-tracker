import { beforeEach, describe, expect, it, vi } from "vitest";

const { cleanupAssistantData, cleanupReadNotifications } = vi.hoisted(() => ({
  cleanupAssistantData: vi.fn(),
  cleanupReadNotifications: vi.fn(),
}));

vi.mock("@/lib/server/assistant/cleanup", () => ({ cleanupAssistantData }));
vi.mock("@/lib/server/notifications/cleanup", () => ({ cleanupReadNotifications }));

import { GET } from "../route";

import { API_ERRORS } from "@/lib/constants/api-errors";

const call = (token?: string) => GET(new Request("http://localhost/api/cron/assistant-cleanup", { headers: token ? { authorization: `Bearer ${token}` } : {} }));

describe("GET /api/cron/assistant-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret");
    cleanupAssistantData.mockResolvedValue({ assistant: 1 });
    cleanupReadNotifications.mockResolvedValue({ notifications: 2 });
  });

  it("returns an error key when the secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const res = await call();

    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(API_ERRORS.CRON_NOT_CONFIGURED);
  });

  it("rejects a wrong token with the unauthorized key", async () => {
    const res = await call("nope");

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe(API_ERRORS.UNAUTHORIZED);
  });

  it("runs both cleanups", async () => {
    const res = await call("s3cret");

    expect(await res.json()).toEqual({ ok: true, assistant: 1, notifications: 2 });
  });

  it("maps a failure to the generic internal error", async () => {
    cleanupAssistantData.mockRejectedValue(new Error("db down"));

    const res = await call("s3cret");

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(API_ERRORS.INTERNAL);
  });
});

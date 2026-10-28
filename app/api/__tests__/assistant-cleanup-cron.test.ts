import { beforeEach, describe, expect, it, vi } from "vitest";

const cleanup = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/assistant/cleanup", () => ({ cleanupAssistantData: cleanup }));

import { GET } from "@/app/api/cron/assistant-cleanup/route";

describe("assistant cleanup cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    cleanup.mockReset().mockResolvedValue({ expired: 2, redacted: 3, receiptsDeleted: 1 });
  });

  it("runs cleanup only for an authorized scheduled request and reports counts", async () => {
    const response = await GET(new Request("https://example.test/api/cron/assistant-cleanup", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, expired: 2, redacted: 3, receiptsDeleted: 1 });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("rejects unauthorized requests without running cleanup", async () => {
    const response = await GET(new Request("https://example.test/api/cron/assistant-cleanup", {
      headers: { authorization: "Bearer wrong-secret" },
    }));

    expect(response.status).toBe(401);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("fails closed when the cron secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(new Request("https://example.test/api/cron/assistant-cleanup", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(503);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("reports cleanup failures as server errors", async () => {
    cleanup.mockRejectedValueOnce(new Error("database failure"));

    const response = await GET(new Request("https://example.test/api/cron/assistant-cleanup", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Assistant cleanup failed" });
  });
});

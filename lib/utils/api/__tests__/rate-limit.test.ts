import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, rateLimitResponse } from "../rate-limit";

const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  class FakeRatelimit {
    static slidingWindow() {
      return {};
    }

    limit(...args: unknown[]) {
      return limitMock(...args);
    }
  }

  return { Ratelimit: FakeRatelimit };
});

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from "@/lib/redis";

afterEach(() => {
  limitMock.mockReset();
  vi.mocked(getRedisClient).mockReset();
});

describe("checkRateLimit", () => {
  it("fail-open якщо Redis недоступний (повертає allowed=true)", async () => {
    vi.mocked(getRedisClient).mockReturnValueOnce(null);

    const result = await checkRateLimit({
      userId: "u1",
      scope: "attack",
      battleId: "b1",
      limit: 10,
      windowSeconds: 5,
    });

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(0);
  });

  it("allowed=true коли count <= limit", async () => {
    vi.mocked(getRedisClient).mockReturnValue({} as never);

    limitMock.mockResolvedValueOnce({
      success: true,
      limit: 10,
      remaining: 5,
      reset: Date.now() + 3000,
    });

    const result = await checkRateLimit({
      userId: "u1",
      scope: "attack",
      battleId: "b1",
      limit: 10,
      windowSeconds: 5,
    });

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(5);
  });

  it("allowed=false коли limiter повертає success:false + retryAfter з reset", async () => {
    vi.mocked(getRedisClient).mockReturnValue({} as never);

    const reset = Date.now() + 7000;

    limitMock.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset,
    });

    const result = await checkRateLimit({
      userId: "u1",
      scope: "attack",
      battleId: "b1",
      limit: 10,
      windowSeconds: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(10);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(6);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(8);
  });

  it("fail-open якщо limiter.limit() кидає помилку", async () => {
    vi.mocked(getRedisClient).mockReturnValue({} as never);

    limitMock.mockRejectedValueOnce(new Error("connection lost"));

    const result = await checkRateLimit({
      userId: "u1",
      scope: "attack",
      limit: 10,
      windowSeconds: 5,
    });

    expect(result.allowed).toBe(true);
  });

  it("без battleId — identifier 'userId:scope'", async () => {
    vi.mocked(getRedisClient).mockReturnValue({} as never);

    limitMock.mockResolvedValueOnce({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 1000,
    });

    await checkRateLimit({
      userId: "u1",
      scope: "global",
      limit: 10,
      windowSeconds: 5,
    });

    expect(limitMock).toHaveBeenCalledWith("u1:global");
  });

  it("з battleId — identifier 'userId:battleId:scope'", async () => {
    vi.mocked(getRedisClient).mockReturnValue({} as never);

    limitMock.mockResolvedValueOnce({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 1000,
    });

    await checkRateLimit({
      userId: "u1",
      scope: "attack",
      battleId: "b1",
      limit: 10,
      windowSeconds: 5,
    });

    expect(limitMock).toHaveBeenCalledWith("u1:b1:attack");
  });
});

describe("rateLimitResponse", () => {
  it("повертає 429 + Retry-After header", async () => {
    const res = rateLimitResponse({
      allowed: false,
      count: 15,
      limit: 10,
      retryAfterSeconds: 7,
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("7");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await res.json();

    expect(body.error).toBe("Too many requests");
    expect(body.retryAfterSeconds).toBe(7);
  });
});

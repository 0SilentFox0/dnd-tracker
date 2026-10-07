import { afterEach, describe, expect, it, vi } from "vitest";

import { getRedirectOrigin } from "../redirect-origin";

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

describe("getRedirectOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignores the per-deployment VERCEL_URL and keeps the host the user came from", () => {
    vi.stubEnv("VERCEL_URL", "dnd-tracker-abc123-team.vercel.app");

    const origin = getRedirectOrigin(
      req("https://dnd-tracker-omega.vercel.app/auth/callback?code=x", { "x-forwarded-host": "dnd-tracker-omega.vercel.app" }),
    );

    expect(origin).toBe("https://dnd-tracker-omega.vercel.app");
  });

  it("uses x-forwarded-host and proto behind a proxy", () => {
    expect(getRedirectOrigin(req("http://localhost:3000/auth/callback", { "x-forwarded-host": "example.test", "x-forwarded-proto": "http" }))).toBe(
      "http://example.test",
    );
  });

  it("falls back to the request origin", () => {
    expect(getRedirectOrigin(req("http://localhost:3000/auth/callback"))).toBe("http://localhost:3000");
  });
});

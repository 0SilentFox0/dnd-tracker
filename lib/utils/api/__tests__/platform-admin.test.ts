import { afterEach, describe, expect, it, vi } from "vitest";

import { isPlatformAdmin } from "@/lib/utils/api/platform-admin";

describe("isPlatformAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads a comma-separated env list, trims, ignores empty", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", " u1 , u2,,");

    expect(isPlatformAdmin("u1")).toBe(true);
    expect(isPlatformAdmin("u2")).toBe(true);
    expect(isPlatformAdmin("u3")).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
  });

  it("no env → nobody is admin", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "");

    expect(isPlatformAdmin("u1")).toBe(false);
  });
});

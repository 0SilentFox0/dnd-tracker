import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_TIME_ZONE } from "../config";
import { getRequestTimeZone } from "../request-time-zone";
import { isTimeZone, resolveTimeZone, TZ_COOKIE } from "../time-zone";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "TZ" && cookieValue.current ? { value: cookieValue.current } : undefined) }) }));

vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

describe("time zone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValue.current = undefined;
    vi.mocked(getSessionUserId).mockResolvedValue(null);
  });

  it("isTimeZone accepts IANA names only", () => {
    expect(isTimeZone("America/New_York")).toBe(true);
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone(undefined)).toBe(false);
  });

  it("falls back to UTC", () => {
    expect(APP_TIME_ZONE).toBe("UTC");
    expect(resolveTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(resolveTimeZone("nope")).toBe("UTC");
  });

  it("uses a valid cookie zone for a guest without touching the DB", async () => {
    cookieValue.current = "America%2FNew_York";

    expect(TZ_COOKIE).toBe("TZ");
    expect(await getRequestTimeZone()).toBe("America/New_York");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("profile beats cookie", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: "Asia/Tokyo" } as never);
    cookieValue.current = "America%2FNew_York";

    expect(await getRequestTimeZone()).toBe("Asia/Tokyo");
  });

  it("invalid or empty profile falls back to the cookie", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    cookieValue.current = "America%2FNew_York";

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: "Not/AZone" } as never);

    expect(await getRequestTimeZone()).toBe("America/New_York");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: null } as never);

    expect(await getRequestTimeZone()).toBe("America/New_York");
  });

  it("falls back to UTC for a malformed, invalid or missing cookie", async () => {
    cookieValue.current = "%";

    expect(await getRequestTimeZone()).toBe("UTC");

    cookieValue.current = "garbage";

    expect(await getRequestTimeZone()).toBe("UTC");

    cookieValue.current = undefined;

    expect(await getRequestTimeZone()).toBe("UTC");
  });
});

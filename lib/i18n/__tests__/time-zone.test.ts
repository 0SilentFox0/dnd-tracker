import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_TIME_ZONE } from "../config";
import { getRequestTimeZone } from "../request-time-zone";
import { isTimeZone, resolveTimeZone, TZ_COOKIE } from "../time-zone";

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "TZ" && cookieValue.current ? { value: cookieValue.current } : undefined) }) }));

vi.mock("server-only", () => ({}));

describe("time zone", () => {
  beforeEach(() => {
    cookieValue.current = undefined;
  });

  it("isTimeZone accepts IANA names only", () => {
    expect(isTimeZone("America/New_York")).toBe(true);
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone(undefined)).toBe(false);
  });

  it("resolveTimeZone falls back to the app zone", () => {
    expect(resolveTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(resolveTimeZone("nope")).toBe(APP_TIME_ZONE);
  });

  it("uses a valid cookie zone", async () => {
    cookieValue.current = "America%2FNew_York";

    expect(TZ_COOKIE).toBe("TZ");
    expect(await getRequestTimeZone()).toBe("America/New_York");
  });

  it("falls back to the app zone for an invalid or missing cookie", async () => {
    cookieValue.current = "garbage";

    expect(await getRequestTimeZone()).toBe(APP_TIME_ZONE);

    cookieValue.current = undefined;

    expect(await getRequestTimeZone()).toBe(APP_TIME_ZONE);
  });
});

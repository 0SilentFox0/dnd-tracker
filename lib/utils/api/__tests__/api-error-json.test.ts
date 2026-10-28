import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRequestLocale, getTranslator } = vi.hoisted(() => ({ getRequestLocale: vi.fn(), getTranslator: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale }));
vi.mock("@/lib/i18n/translator", () => ({ getTranslator }));

import { PRIVATE_NO_STORE_HEADERS } from "../cache-headers";
import { apiErrorJson } from "../translate-error";

const t = Object.assign((key: string) => `T:${key}`, { has: (key: string) => key === "errors.known", raw: () => ({}) });

describe("apiErrorJson", () => {
  beforeEach(() => {
    getRequestLocale.mockReset().mockResolvedValue("en");
    getTranslator.mockReset().mockResolvedValue(t);
  });

  it("keeps status, content type, init headers and extra fields", async () => {
    const response = apiErrorJson({ error: "errors.known", code: "X", version: 3 }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });

    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe(new Headers(PRIVATE_NO_STORE_HEADERS).get("Cache-Control"));
    expect(await response.json()).toEqual({ error: "T:errors.known", errorKey: "errors.known", code: "X", version: 3 });
  });

  it("falls back to uk when the locale lookup throws", async () => {
    getRequestLocale.mockRejectedValue(new Error("no request"));

    const response = apiErrorJson({ error: "errors.known" }, { status: 400 });

    expect((await response.json()).errorKey).toBe("errors.known");
    expect(getTranslator).toHaveBeenCalledWith("uk");
  });

  it("returns the raw error when the translator throws", async () => {
    getTranslator.mockRejectedValue(new Error("boom"));

    const response = apiErrorJson({ error: "errors.known", issues: [{ message: "m" }] }, { status: 400 });

    expect(await response.json()).toEqual({ error: "errors.known", issues: [{ message: "m" }] });
  });
});

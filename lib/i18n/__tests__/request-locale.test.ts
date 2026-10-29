import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRequestLocale } from "../request-locale";

vi.unmock("@/lib/i18n/request-locale");

const h = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  cookies: new Map<string, string>(),
  token: vi.fn(),
  user: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (h.cookies.has(name) ? { value: h.cookies.get(name) } : undefined) }),
  headers: async () => new Headers([...h.headers]),
}));
vi.mock("@/lib/db", () => ({ prisma: { apiToken: { findUnique: h.token }, user: { findUnique: h.user } } }));

let n = 0;

describe("getRequestLocale for REST Bearer requests", () => {
  beforeEach(() => {
    h.headers.clear();
    h.cookies.clear();
    vi.clearAllMocks();
    h.headers.set("authorization", `Bearer dnd_secret_${++n}`);
  });

  it("uses the token owner's profile locale", async () => {
    h.token.mockResolvedValue({ revokedAt: null, userId: "u1" });
    h.user.mockResolvedValue({ locale: "uk" });

    expect(await getRequestLocale()).toBe("uk");
  });

  it("falls back to en for an unknown or revoked token or an owner without a locale", async () => {
    h.token.mockResolvedValue(null);

    expect(await getRequestLocale()).toBe("en");

    h.headers.set("authorization", "Bearer dnd_revoked");
    h.token.mockResolvedValue({ revokedAt: new Date(), userId: "u1" });

    expect(await getRequestLocale()).toBe("en");

    h.headers.set("authorization", "Bearer dnd_nolocale");
    h.token.mockResolvedValue({ revokedAt: null, userId: "u1" });
    h.user.mockResolvedValue({ locale: null });

    expect(await getRequestLocale()).toBe("en");
  });

  it("an explicit Accept-Language wins and skips the lookup", async () => {
    h.headers.set("accept-language", "uk");

    expect(await getRequestLocale()).toBe("uk");
    expect(h.token).not.toHaveBeenCalled();
  });

  it("without a Bearer token the default locale applies", async () => {
    h.headers.clear();

    expect(await getRequestLocale()).toBe("uk");
  });
});

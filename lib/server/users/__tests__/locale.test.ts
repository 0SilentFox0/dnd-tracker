import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { syncUserLocale } from "@/lib/server/users/locale";

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } } }));

const profile = (locale: string | null) => vi.mocked(prisma.user.findUnique).mockResolvedValue({ locale } as never);

beforeEach(() => vi.clearAllMocks());

describe("syncUserLocale", () => {
  it("empty profile + cookie en: writes only into a null profile and returns null", async () => {
    profile(null);

    expect(await syncUserLocale("u1", "en")).toBeNull();
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "u1", locale: null }, data: { locale: "en" } });
  });

  it("profile uk + cookie en: returns the profile locale, no write", async () => {
    profile("uk");

    expect(await syncUserLocale("u1", "en")).toBe("uk");
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it.each([undefined, "fr"])("no usable cookie (%s): no write", async (cookie) => {
    profile(null);

    expect(await syncUserLocale("u1", cookie)).toBeNull();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});

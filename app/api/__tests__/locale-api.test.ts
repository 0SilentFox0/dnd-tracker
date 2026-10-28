import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PUT } from "@/app/api/locale/route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } } }));

const put = (body: unknown) => new Request("http://x/api/locale", { method: "PUT", body: JSON.stringify(body) });

describe("/api/locale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserId).mockResolvedValue(null);
  });

  it("PUT без сесії ставить cookie і не чіпає БД", async () => {
    const res = await PUT(put({ locale: "en" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("NEXT_LOCALE=en");
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("PUT із сесією зберігає locale у БД", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");

    const res = await PUT(put({ locale: "uk" }));

    expect(res.status).toBe(200);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "u1" }, data: { locale: "uk" } });
  });

  it("PUT з невалідним locale — 400", async () => {
    expect((await PUT(put({ locale: "fr" }))).status).toBe(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("GET з User.locale=en ставить cookie", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ locale: "en" } as never);

    const res = await GET();

    expect(await res.json()).toEqual({ locale: "en" });
    expect(res.headers.get("set-cookie")).toContain("NEXT_LOCALE=en");
  });

  it("GET з User.locale=null не ставить cookie", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ locale: null } as never);

    const res = await GET();

    expect(await res.json()).toEqual({ locale: null });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("GET без сесії не читає БД", async () => {
    const res = await GET();

    expect(res.headers.get("set-cookie")).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

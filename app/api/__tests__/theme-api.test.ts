import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PUT } from "@/app/api/theme/route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } } }));

const put = (body: unknown) => new Request("http://x/api/theme", { method: "PUT", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUserId).mockResolvedValue("user-a");
  vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
});

describe("/api/theme", () => {
  it("requires a session for reading and writing", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(put({ palette: "forest" }))).status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("reads only the current user's palette and never caches the response", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ palette: "frost" } as never);

    const response = await GET();

    expect(await response.json()).toEqual({ userId: "user-a", palette: "frost" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-a" }, select: { palette: true } });
  });

  it.each([null, "removed-theme"])("falls back for %s", async (palette) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ palette } as never);
    expect(await (await GET()).json()).toEqual({ userId: "user-a", palette: "tavern" });
  });

  it.each(["tavern", "midnight", "forest", "parchment", "amethyst", "frost"])("saves %s only for the session user", async (palette) => {
    const response = await PUT(put({ palette, userId: "someone-else" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: "user-a", palette });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user-a" }, data: { palette } });
  });

  it.each([{}, { palette: "unknown" }, { palette: null }])("rejects invalid input %j", async (body) => {
    expect((await PUT(put(body))).status).toBe(400);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("does not report success if the profile no longer exists", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });
    expect((await PUT(put({ palette: "forest" }))).status).toBe(404);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const kv = vi.hoisted(() => ({ kvGet: vi.fn(), kvSet: vi.fn(), kvDel: vi.fn() }));

vi.mock("@/lib/cache/kv", () => kv);
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(async () => ({ userId: "u1", authUser: { id: "u1" } })),
}));

import { GET } from "@/app/api/campaigns/route";

describe("GET /api/campaigns", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["з БД", null],
    ["з KV", [{ id: "c1" }]],
  ])("список кампанії користувача (%s) — private, no-store", async (_source, cached) => {
    kv.kvGet.mockResolvedValue(cached);

    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

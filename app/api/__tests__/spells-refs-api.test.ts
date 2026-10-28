import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireCampaignAccess: vi.fn() }));

const cached = vi.hoisted(() => ({ getCachedSpells: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/reference-data", () => cached);
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({ ...(await orig<object>()), requireCampaignAccess: auth.requireCampaignAccess }));

import { GET } from "@/app/api/campaigns/[id]/spells/refs/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

describe("GET /spells/refs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireCampaignAccess.mockResolvedValue({ userId: "player" });
    cached.getCachedSpells.mockResolvedValue([
      { id: "s1", name: "Bolt", level: 1, lists: ["wizard"], description: "long text", fx: { a: 1 }, spellGroup: { id: "g" } },
      { id: "s2", name: "Odd", level: 0, lists: null },
    ]);
  });

  it("повертає лише id, name, level, lists і доступний гравцю, як список", async () => {
    const res = await GET(new Request("http://x"), ctx);

    expect(auth.requireCampaignAccess).toHaveBeenCalledWith("c1", false);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual([{ id: "s1", name: "Bolt", level: 1, lists: ["wizard"] }, { id: "s2", name: "Odd", level: 0, lists: [] }]);
  });

  it("без членства — відмова доступу, кеш не читається", async () => {
    auth.requireCampaignAccess.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
    expect(cached.getCachedSpells).not.toHaveBeenCalled();
  });
});

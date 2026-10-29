import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCachedSpells } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { spell: { findMany: vi.fn() } } }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedSpells: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const get = async (query: string) => {
  const mod = await import("@/app/api/campaigns/[id]/spells/route");

  return mod.GET(new Request(`http://x/api/campaigns/camp/spells${query}`), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

const row = { id: "s1", name: "Іскра", level: 1, description: "Бʼє", appearanceDescription: null, icon: null, dice: 1, cost: "action", targeting: null, resolution: null, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], stackable: false, maxStacks: null, spellGroup: { id: "g", name: "Вогонь" } };

describe("GET /spells?ids=", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u", isDM: false, campaign: { id: "camp", maxLevel: 20, members: [{ role: "player" }] } } as never);
    vi.mocked(prisma.spell.findMany).mockResolvedValue([row] as never);
  });

  it("повертає лише запитані заклинання кампанії у форматі книги, без бібліотеки", async () => {
    const res = await get("?ids=s1,s2,s1");

    expect(res.status).toBe(200);
    expect(getCachedSpells).not.toHaveBeenCalled();

    const args = vi.mocked(prisma.spell.findMany).mock.calls[0][0] as { where: unknown; select: Record<string, unknown> };

    expect(args.where).toEqual({ campaignId: "camp", id: { in: ["s1", "s2"] } });
    expect(args.select.effects).toBeUndefined();
    expect(args.select).toMatchObject({ name: true, spellEffects: true, stackable: true, maxStacks: true });
    expect(await res.json()).toEqual([
      { id: "s1", name: "Іскра", level: 1, description: "Бʼє", appearanceDescription: null, icon: null, spellGroup: { id: "g", name: "Вогонь" }, dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: row.spellEffects },
    ]);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("понад 200 id — 400", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `s${i}`).join(",");

    const res = await get(`?ids=${ids}`);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.INVALID_QUERY);
    expect(prisma.spell.findMany).not.toHaveBeenCalled();
  });

  it("без ids — уся бібліотека з кешу, як раніше", async () => {
    vi.mocked(getCachedSpells).mockResolvedValue([] as never);

    expect((await get("")).status).toBe(200);
    expect(getCachedSpells).toHaveBeenCalledWith("camp");
  });

  it("без доступу до кампанії — відповідь доступу", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    expect((await get("?ids=s1")).status).toBe(403);
  });
});

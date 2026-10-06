import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  spell: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  spellGroup: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

const auth = vi.hoisted(() => ({
  requireDM: vi.fn(),
  requireCampaignAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedSpells: vi.fn(async () => []) }));
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({
  ...(await orig<object>()),
  requireDM: auth.requireDM,
  requireCampaignAccess: auth.requireCampaignAccess,
}));

import * as removeFromGroup from "@/app/api/campaigns/[id]/spells/[spellId]/remove-from-group/route";
import * as one from "@/app/api/campaigns/[id]/spells/[spellId]/route";
import * as deleteAll from "@/app/api/campaigns/[id]/spells/delete-all/route";
import * as deleteByLevel from "@/app/api/campaigns/[id]/spells/delete-by-level/route";
import * as removeAllSpells from "@/app/api/campaigns/[id]/spells/groups/[groupId]/remove-all-spells/route";
import * as group from "@/app/api/campaigns/[id]/spells/groups/[groupId]/route";
import * as groups from "@/app/api/campaigns/[id]/spells/groups/route";
import * as importRoute from "@/app/api/campaigns/[id]/spells/import/route";
import * as list from "@/app/api/campaigns/[id]/spells/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxSpell = { params: Promise.resolve({ id: "c1", spellId: "s1" }) };

const ctxGroup = { params: Promise.resolve({ id: "c1", groupId: "g1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const spellBody = { name: "Вогняна куля", level: 3, type: "aoe", damageType: "damage" };

const writes: Array<[string, () => Promise<Response>]> = [
  ["POST /spells", () => list.POST(req("POST", spellBody), ctx)],
  ["PATCH /spells/:id", () => one.PATCH(req("PATCH", { name: "Нова" }), ctxSpell)],
  ["DELETE /spells/:id", () => one.DELETE(req("DELETE"), ctxSpell)],
  ["DELETE /spells/delete-all", () => deleteAll.DELETE(req("DELETE"), ctx)],
  ["DELETE /spells/delete-by-level", () => deleteByLevel.DELETE(req("DELETE", { level: 2 }), ctx)],
  ["POST /spells/:id/remove-from-group", () => removeFromGroup.POST(req("POST"), ctxSpell)],
  ["POST /spells/import", () => importRoute.POST(req("POST", { spells: [{ name: "Іскра", description: "d" }] }), ctx)],
  ["POST /spells/groups", () => groups.POST(req("POST", { name: "Вогонь" }), ctx)],
  ["PATCH /spells/groups/:id", () => group.PATCH(req("PATCH", { name: "Лід" }), ctxGroup)],
  ["DELETE /spells/groups/:id", () => group.DELETE(req("DELETE"), ctxGroup)],
  ["POST /spells/groups/:id/remove-all-spells", () => removeAllSpells.POST(req("POST"), ctxGroup)],
];

const dbWrites = () => [
  db.spell.create, db.spell.createMany, db.spell.update, db.spell.updateMany, db.spell.delete, db.spell.deleteMany,
  db.spellGroup.create, db.spellGroup.update, db.spellGroup.deleteMany,
];

describe("spells API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ userId: "dm" });
    auth.requireCampaignAccess.mockResolvedValue({ userId: "dm" });
    db.spell.create.mockResolvedValue({ id: "s9" });
    db.spell.createMany.mockResolvedValue({ count: 1 });
    db.spell.findUnique.mockResolvedValue({ id: "s1", campaignId: "c1" });
    db.spell.findMany.mockResolvedValue([]);
    db.spell.update.mockResolvedValue({ id: "s1" });
    db.spell.updateMany.mockResolvedValue({ count: 2 });
    db.spell.deleteMany.mockResolvedValue({ count: 2 });
    db.spellGroup.create.mockResolvedValue({ id: "g9" });
    db.spellGroup.findFirst.mockResolvedValue(null);
    db.spellGroup.findUnique.mockResolvedValue({ id: "g1", campaignId: "c1" });
    db.spellGroup.update.mockResolvedValue({ id: "g1" });
  });

  it("GET — private, no-store (дані кампанії не потрапляють у CDN)", async () => {
    const res = await list.GET(req("GET"), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("GET без членства — 403", async () => {
    auth.requireCampaignAccess.mockResolvedValue(forbidden());

    expect((await list.GET(req("GET"), ctx)).status).toBe(403);
  });

  it.each(writes)("%s скидає кеш заклинань одразу", async (_name, call) => {
    const res = await call();

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("spells-c1", { expire: 0 });
  });

  it.each(writes)("%s гравцю — 403 без запису й інвалідації", async (_name, call) => {
    auth.requireDM.mockResolvedValue(forbidden());

    const res = await call();

    expect(res.status).toBe(403);
    for (const write of dbWrites()) expect(write).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

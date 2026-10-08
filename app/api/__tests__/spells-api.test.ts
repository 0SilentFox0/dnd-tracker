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
import * as list from "@/app/api/campaigns/[id]/spells/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxSpell = { params: Promise.resolve({ id: "c1", spellId: "s1" }) };

const ctxGroup = { params: Promise.resolve({ id: "c1", groupId: "g1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const spellBody = { name: "Вогняна куля", level: 3, dice: 4, targeting: { kind: "area", side: "enemy", maxTargets: 4 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }] };

const writes: Array<[string, () => Promise<Response>]> = [
  ["POST /spells", () => list.POST(req("POST", spellBody), ctx)],
  ["PATCH /spells/:id", () => one.PATCH(req("PATCH", { name: "Нова" }), ctxSpell)],
  ["DELETE /spells/:id", () => one.DELETE(req("DELETE"), ctxSpell)],
  ["DELETE /spells/delete-all", () => deleteAll.DELETE(req("DELETE"), ctx)],
  ["DELETE /spells/delete-by-level", () => deleteByLevel.DELETE(req("DELETE", { level: 2 }), ctx)],
  ["POST /spells/:id/remove-from-group", () => removeFromGroup.POST(req("POST"), ctxSpell)],
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

  it("POST зберігає нову модель в окремих колонках і не пише старі поля", async () => {
    await list.POST(req("POST", spellBody), ctx);

    const data = db.spell.create.mock.calls[0][0].data;

    expect(data).toMatchObject({ campaignId: "c1", name: "Вогняна куля", level: 3, dice: 4, cost: "action", targeting: { kind: "area", side: "enemy", maxTargets: 4 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: spellBody.spellEffects, raceModifiers: [] });
    expect(data).not.toHaveProperty("diceCount");
    expect(data).not.toHaveProperty("savingThrow");
  });

  it("POST відхиляє area без side, невалідний ефект і кубики поза межами", async () => {
    for (const bad of [{ targeting: { kind: "area", maxTargets: 2 } }, { spellEffects: [{ kind: "teleport" }] }, { dice: 99 }]) {
      expect((await list.POST(req("POST", { ...spellBody, ...bad }), ctx)).status).toBe(400);
    }

    expect(db.spell.create).not.toHaveBeenCalled();
  });

  it("PATCH оновлює лише передані поля нової моделі", async () => {
    await one.PATCH(req("PATCH", { dice: 5, resolution: { kind: "auto" } }), ctxSpell);

    const data = db.spell.update.mock.calls[0][0].data;

    expect(data).toMatchObject({ dice: 5, resolution: { kind: "auto" } });
    expect(data.targeting).toBeUndefined();
    expect(data.name).toBeUndefined();
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

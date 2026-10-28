import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  unit: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "dm" })),
}));

import * as one from "@/app/api/campaigns/[id]/units/[unitId]/route";
import * as deleteAll from "@/app/api/campaigns/[id]/units/delete-all/route";
import * as list from "@/app/api/campaigns/[id]/units/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = { params: Promise.resolve({ id: "c1", unitId: "u1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const row = { id: "u1", campaignId: "c1", name: "Гоблін", raceId: null, avatar: "not a url", attacks: [], specialAbilities: [], abilities: [] };

describe("units API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.count.mockResolvedValue(1);
    db.unit.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "u9", ...data }));
    db.unit.findUnique.mockResolvedValue(row);
    db.unit.findFirst.mockResolvedValue(row);
    db.unit.update.mockImplementation(async ({ data }: { data: object }) => ({ ...row, ...data }));
    db.unit.deleteMany.mockResolvedValue({ count: 3 });
  });

  it("GET — private, no-store", async () => {
    const res = (await list.GET(req("GET"), ctx)) as NextResponse;

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("POST з raceId цієї кампанії — 201, пише raceId, інвалідує units з expire: 0", async () => {
    const res = (await list.POST(req("POST", { name: "Шаман", raceId: "r1", armorClass: 0 }), ctx)) as NextResponse;

    expect(res.status).toBe(201);
    expect(db.race.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["r1"] } } });
    expect(db.unit.create.mock.calls[0][0].data).toMatchObject({ campaignId: "c1", name: "Шаман", raceId: "r1", armorClass: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
  });

  it("gridSize зберігається в POST і PATCH", async () => {
    await list.POST(req("POST", { name: "Огр", gridSize: 2 }), ctx);
    await one.PATCH(req("PATCH", { gridSize: 3 }), ctxOne);

    expect(db.unit.create.mock.calls[0][0].data.gridSize).toBe(2);
    expect(db.unit.update.mock.calls[0][0].data.gridSize).toBe(3);
  });

  it("POST з расою іншої кампанії — 400, нічого не створено", async () => {
    db.race.count.mockResolvedValue(0);

    const res = (await list.POST(req("POST", { name: "Шаман", raceId: "foreign" }), ctx)) as NextResponse;

    expect(res.status).toBe(400);
    expect(db.unit.create).not.toHaveBeenCalled();
  });

  it("avatar: та сама схема в POST і PATCH — data: URL відхиляється", async () => {
    expect(((await list.POST(req("POST", { name: "X", avatar: "data:image/png;base64,AAA" }), ctx)) as NextResponse).status).toBe(400);
    expect(((await one.PATCH(req("PATCH", { avatar: "data:image/png;base64,AAA" }), ctxOne)) as NextResponse).status).toBe(400);
  });

  it("PATCH без avatar не чіпає збережений (навіть невалідний) avatar", async () => {
    const res = (await one.PATCH(req("PATCH", { name: "Орк" }), ctxOne)) as NextResponse;

    expect(res.status).toBe(200);
    expect(db.unit.update.mock.calls[0][0].data.avatar).toBeUndefined();
    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
  });

  it("PATCH avatar \"\" → null; raceId null → «Без раси» без перевірки раси", async () => {
    await one.PATCH(req("PATCH", { avatar: "", raceId: null }), ctxOne);

    expect(db.unit.update.mock.calls[0][0].data).toMatchObject({ avatar: null, raceId: null });
    expect(db.race.count).not.toHaveBeenCalled();
  });

  it("PATCH записує morale", async () => {
    await one.PATCH(req("PATCH", { morale: 2 }), ctxOne);

    expect(db.unit.update.mock.calls[0][0].data.morale).toBe(2);
  });

  it("юніт іншої кампанії — 404, нічого не змінено", async () => {
    db.unit.findFirst.mockResolvedValue(null);

    expect(((await one.PATCH(req("PATCH", { name: "X" }), ctxOne)) as NextResponse).status).toBe(404);
    expect(db.unit.update).not.toHaveBeenCalled();
  });

  it("DELETE юніта і delete-all інвалідують units", async () => {
    const single = (await one.DELETE(req("DELETE"), ctxOne)) as NextResponse;

    const all = (await deleteAll.DELETE(req("DELETE"), ctx)) as NextResponse;

    expect(await single.json()).toEqual({ ok: true });
    expect(await all.json()).toEqual({ ok: true, deleted: 3 });

    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(2, "units-c1", { expire: 0 });
  });
});

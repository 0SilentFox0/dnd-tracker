import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const db = vi.hoisted(() => {
  const m = {
    race: { findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    character: { updateMany: vi.fn() },
    skillTree: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };

  m.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(m));

  return m;
});

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedRaces: vi.fn(async () => [{ id: "r1", name: "Ельф" }]) }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "dm" })),
}));

import * as one from "@/app/api/campaigns/[id]/races/[raceId]/route";
import * as list from "@/app/api/campaigns/[id]/races/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = { params: Promise.resolve({ id: "c1", raceId: "r1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const elf = { id: "r1", campaignId: "c1", name: "Ельф", color: "#22c55e" };

describe("races API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.findFirst.mockResolvedValue(null);
    db.race.findUnique.mockResolvedValue(elf);
    db.race.count.mockResolvedValue(2);
    db.race.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    db.race.update.mockImplementation(async ({ data }: { data: object }) => ({ ...elf, ...data }));
  });

  it("GET — private, no-store", async () => {
    const res = (await list.GET(req("GET"), ctx)) as NextResponse;

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("POST дубля назви без урахування регістру — 409, нічого не створено", async () => {
    db.race.findFirst.mockResolvedValue({ id: "r1" });

    const res = (await list.POST(req("POST", { name: "  ельф " }), ctx)) as NextResponse;

    expect(res.status).toBe(409);
    expect(db.race.findFirst).toHaveBeenCalledWith({
      where: { campaignId: "c1", name: { equals: "ельф", mode: "insensitive" } },
      select: { id: true },
    });
    expect(db.race.create).not.toHaveBeenCalled();
  });

  it("POST без кольору — колір з палітри за кількістю рас; інвалідує races і units", async () => {
    const res = (await list.POST(req("POST", { name: "Орк" }), ctx)) as NextResponse;

    expect(res.status).toBe(201);
    expect(db.race.create.mock.calls[0][0].data).toMatchObject({ name: "Орк", color: "#eab308" });
    expect(revalidateTag).toHaveBeenCalledWith("races-c1", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
  });

  it("POST з кольором — зберігає його; невалідний колір — 400", async () => {
    await list.POST(req("POST", { name: "Орк", color: "#123456" }), ctx);
    expect(db.race.create.mock.calls[0][0].data).toMatchObject({ color: "#123456" });

    const bad = (await list.POST(req("POST", { name: "Орк", color: "red" }), ctx)) as NextResponse;

    expect(bad.status).toBe(400);
  });

  it("PATCH перейменування — одна транзакція: раса, персонажі й дерева за старою назвою", async () => {
    const res = (await one.PATCH(req("PATCH", { name: "Високий ельф" }), ctxOne)) as NextResponse;

    expect(res.status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.race.update.mock.calls[0][0]).toMatchObject({ where: { id: "r1" }, data: { name: "Високий ельф" } });
    expect(db.character.updateMany).toHaveBeenCalledWith({ where: { campaignId: "c1", race: { equals: "Ельф", mode: "insensitive" } }, data: { race: "Високий ельф" } });
    expect(db.skillTree.updateMany).toHaveBeenCalledWith({ where: { campaignId: "c1", race: { equals: "Ельф", mode: "insensitive" } }, data: { race: "Високий ельф" } });
    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
    expect(await getResponseJson(res)).toMatchObject({ name: "Високий ельф" });
  });

  it("PATCH без зміни назви — каскаду немає", async () => {
    await one.PATCH(req("PATCH", { color: "#000000" }), ctxOne);

    expect(db.character.updateMany).not.toHaveBeenCalled();
    expect(db.skillTree.updateMany).not.toHaveBeenCalled();
  });

  it("PATCH на назву іншої раси — 409, без оновлення", async () => {
    db.race.findFirst.mockResolvedValue({ id: "r2" });

    const res = (await one.PATCH(req("PATCH", { name: "ОРК" }), ctxOne)) as NextResponse;

    expect(res.status).toBe(409);
    expect(db.race.findFirst).toHaveBeenCalledWith({
      where: { campaignId: "c1", name: { equals: "ОРК", mode: "insensitive" }, id: { not: "r1" } },
      select: { id: true },
    });
    expect(db.race.update).not.toHaveBeenCalled();
  });

  it("DELETE — інвалідує units (юніти раси стають «Без раси»)", async () => {
    await one.DELETE(req("DELETE"), ctxOne);

    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
  });
});

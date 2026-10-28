import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  inventoryLog: { createMany: vi.fn() },
  characterInventory: { upsert: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  artifact: { findFirst: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn() },
    characterInventory: { findUnique: vi.fn() },
    inventoryLog: { findMany: vi.fn() },
    user: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

const access = (userId: string, role: "dm" | "player") => ({ userId, isDM: role === "dm", campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const params = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

const post = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/route");

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
};

const get = async (path: "stash" | "log") => {
  const mod =
    path === "stash"
      ? await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/route")
      : await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/log/route");

  return mod.GET(new Request("http://x"), params) as Promise<NextResponse>;
};

const setChar = (over: Record<string, unknown> = {}) =>
  vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "owner", status: "active", ...over } as never);

const inv = (over: Record<string, unknown> = {}) => ({ characterId: "a", equipped: {}, stash: [], items: [], gold: 5, silver: 0, copper: 0, ...over });

describe("stash API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    setChar();
    tx.characterInventory.upsert.mockResolvedValue(inv());
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => ({ ...inv(), ...data }));
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.artifact.findFirst.mockResolvedValue({ slot: "helmet" });
    tx.artifact.findMany.mockResolvedValue([]);
  });

  it("гравець витрачає гроші: інвентар і запис журналу в одній транзакції під локом", async () => {
    const res = await post({ action: "spend", amount: 2, coin: "gp", note: "Лікар" });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.characterInventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ gold: 3 }) }));
    expect(tx.inventoryLog.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ campaignId: "camp", characterId: "a", actorUserId: "owner", kind: "money_spend", note: "Лікар" })],
    });
  });

  it("не вистачає грошей — 400, нічого не записано", async () => {
    const res = await post({ action: "spend", amount: 100, coin: "gp", note: "Замок" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.NOT_ENOUGH_MONEY);
    expect(tx.characterInventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryLog.createMany).not.toHaveBeenCalled();
  });

  it.each([{ action: "grant", artifactId: "x" }, { action: "revoke", artifactId: "x" }, { action: "setMoney", gp: 1, sp: 0, cp: 0 }])("гравець не може %j — 403", async (body) => {
    const res = await post(body);

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("чужий персонаж — 403", async () => {
    setChar({ controlledBy: "someone" });

    expect((await post({ action: "gain", amount: 1, coin: "gp" })).status).toBe(403);
  });

  it("персонаж з іншої кампанії — 403", async () => {
    setChar({ campaignId: "other" });

    expect((await post({ action: "gain", amount: 1, coin: "gp" })).status).toBe(403);
  });

  it("власник чернетки (pending) не діє у сховку — 403", async () => {
    setChar({ status: "pending" });

    expect((await post({ action: "gain", amount: 1, coin: "gp" })).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("ДМ може діяти на чернетці", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    setChar({ status: "pending" });

    expect((await post({ action: "setMoney", gp: 1, sp: 2, cp: 3 })).status).toBe(200);
  });

  it("ДМ видає артефакт, який уже носить інший герой — 409", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    tx.characterInventory.findMany.mockResolvedValue([{ characterId: "b", equipped: { helmet: "art1" }, stash: [], character: { name: "Борис" } }]);

    const res = await post({ action: "grant", artifactId: "art1" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Борис");
    expect(tx.characterInventory.update).not.toHaveBeenCalled();
  });

  it("артефакт з іншої кампанії — 404", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    tx.artifact.findFirst.mockResolvedValue(null);

    expect((await post({ action: "grant", artifactId: "foreign" })).status).toBe(404);
    expect(tx.artifact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", campaignId: "camp" } }));
  });

  it("не споживна річ не витрачається — 400", async () => {
    tx.characterInventory.upsert.mockResolvedValue(inv({ items: [{ id: "k", name: "Ключ", quantity: 1, consumable: false }] }));

    expect((await post({ action: "useItem", itemId: "k" })).status).toBe(400);
  });

  it("переповнення гаманця — 400", async () => {
    tx.characterInventory.upsert.mockResolvedValue(inv({ gold: 2_147_483_647 }));

    const res = await post({ action: "gain", amount: 1, coin: "gp" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.MONEY_OVERFLOW);
  });

  it("GET сховку: чужий гравець — 403, власник — 200", async () => {
    vi.mocked(prisma.characterInventory.findUnique).mockResolvedValue(inv() as never);
    expect((await get("stash")).status).toBe(200);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));
    expect((await get("stash")).status).toBe(403);
  });

  it("GET журналу: чужий гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));

    expect((await get("log")).status).toBe(403);
    expect(prisma.inventoryLog.findMany).not.toHaveBeenCalled();
  });

  it("GET журналу: власник отримує сторінку з курсором", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ id: `l${i}`, characterId: "a", kind: "money_gain", delta: {}, note: null, createdAt: new Date(), actorUserId: "owner" }));

    vi.mocked(prisma.inventoryLog.findMany).mockResolvedValue(rows as never);

    const res = await get("log");

    expect(res.status).toBe(200);
    expect((await res.json()).nextCursor).not.toBeNull();
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));

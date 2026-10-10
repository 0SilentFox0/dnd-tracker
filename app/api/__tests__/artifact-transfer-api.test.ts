import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  characterInventory: { upsert: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn() },
    characterInventory: { update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

const access = (userId: string, role: "dm" | "player") => ({ userId, isDM: role === "dm", campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const params = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

const post = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/route");

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
};

const patch = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/inventory/route");

  return mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
};

const inventories: Record<string, Record<string, string>> = {};

describe("artifact transfer API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inventories.a = { helmet: "h1" };
    inventories.b = {};
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) => {
      if (where.id === "a") return { id: "a", campaignId: "camp", controlledBy: "u1", inventory: { gold: 0, silver: 0, copper: 0, equipped: inventories.a, backpack: [], items: [] } };

      if (where.id === "b") return { id: "b", campaignId: "camp", controlledBy: "u3" };

      if (where.id === "x") return { id: "x", campaignId: "other", controlledBy: null };

      return null;
    }) as never);
    tx.characterInventory.upsert.mockImplementation(async ({ where }: { where: { characterId: string } }) => ({ characterId: where.characterId, equipped: inventories[where.characterId] ?? {} }));
    tx.characterInventory.update.mockImplementation(async ({ where, data }: { where: { characterId: string }; data: { equipped: unknown } }) => ({ characterId: where.characterId, equipped: data.equipped }));
    tx.characterInventory.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    tx.characterInventory.findMany.mockResolvedValue([]);
  });

  it("ДМ передає в вільний слот", async () => {
    const res = await post({ slot: "helmet", toCharacterId: "b" });

    expect(res.status).toBe(200);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "a" }, data: { equipped: {} } });
    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "b" }, data: { equipped: { helmet: "h1" } } });
  });

  it("гравець-власник передає свій артефакт", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("u1", "player"));

    expect((await post({ slot: "helmet", toCharacterId: "b" })).status).toBe(200);
  });

  it("чужий гравець — 403 без транзакції", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("u2", "player"));

    expect((await post({ slot: "helmet", toCharacterId: "b" })).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("отримувач з іншої кампанії — 403, нічого не записано", async () => {
    expect((await post({ slot: "helmet", toCharacterId: "x" })).status).toBe(403);
    expect(tx.characterInventory.update).not.toHaveBeenCalled();
  });

  it("відправник не знайдений — 404", async () => {
    vi.mocked(prisma.character.findUnique).mockResolvedValue(null as never);

    expect((await post({ slot: "helmet", toCharacterId: "b" })).status).toBe(404);
  });

  it("порожній слот — 400", async () => {
    const res = await post({ slot: "boots", toCharacterId: "b" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.ARTIFACT_SLOT_EMPTY);
  });

  it("зайнятий слот — обмін", async () => {
    inventories.b = { helmet: "h2" };

    expect((await post({ slot: "helmet", toCharacterId: "b" })).status).toBe(200);
    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "a" }, data: { equipped: { helmet: "h2" } } });
    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "b" }, data: { equipped: { helmet: "h1" } } });
  });

  it("невалідне тіло — 400", async () => {
    expect((await post({})).status).toBe(400);
  });
});

describe("PATCH inventory — унікальність артефакта", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", inventory: { gold: 0, silver: 0, copper: 0, equipped: {}, backpack: [], items: [] } } as never);
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  it("артефакт носить інший герой — 409 з ім'ям", async () => {
    tx.characterInventory.findMany.mockResolvedValue([{ characterId: "b", equipped: { helmet: "h1" }, character: { name: "Боромир" } }]);

    const res = await patch({ equipped: { helmet: "h1" } });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Боромир");
    expect(tx.characterInventory.update).not.toHaveBeenCalled();
  });

  it("вільний артефакт — 200", async () => {
    tx.characterInventory.findMany.mockResolvedValue([{ characterId: "b", equipped: { boots: "b1" }, character: { name: "Боромир" } }]);

    expect((await patch({ equipped: { helmet: "h1" } })).status).toBe(200);
    expect(tx.characterInventory.update).toHaveBeenCalled();
  });
});

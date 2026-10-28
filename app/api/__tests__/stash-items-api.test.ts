import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";
import { parseRules } from "@/lib/utils/rules/schema";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/server/characters/battle-lock", () => ({ rejectIfInActiveBattle: vi.fn(async () => null) }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  inventoryLog: { createMany: vi.fn() },
  characterInventory: { upsert: vi.fn(), update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  artifact: { findFirst: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn() },
    characterInventory: { findMany: vi.fn() },
    artifact: { findMany: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

const row = (id: string, name: string, slot: string, item?: ItemStats) => ({ id, name, icon: null, rarity: "rare", slot, description: null, bonuses: {}, modifiers: [...(slot === "weapon" ? weaponStatsColumns({ damageDice: "1d8" }).modifiers : []), ...(item ? itemStatsColumns(item).modifiers : [])] });

const ROWS = [
  row("ls", "Longsword", "weapon", { unique: false }),
  row("ft", "Flame Tongue", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
  row("ring", "Ring of Protection", "ring", { unique: false, attunement: true }),
  row("pot", "Potion of Healing", "item", { unique: false, consumable: true }),
];

const byId = (id: string) => ROWS.find((r) => r.id === id) ?? null;

const access = (rules = parseRules({ items: { enabled: true } })) => ({ userId: "dm", isDM: true, campaign: { id: "camp", members: [], rules } }) as never;

const params = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

const post = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/route");

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
};

const inv = (over: Record<string, unknown> = {}) => ({ characterId: "a", equipped: {}, stash: [], attuned: [], items: [], gold: 0, silver: 0, copper: 0, ...over });

describe("stash API: magic items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access());
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "dm", status: "active", resources: {} } as never);
    tx.characterInventory.upsert.mockResolvedValue(inv());
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => ({ ...inv(), ...data }));
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.artifact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => byId(where.id));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
  });

  it("property without a base → 422; with a matching base → composed ref in the stash", async () => {
    const bare = await post({ action: "grant", artifactId: "ft" });

    expect(bare.status).toBe(422);
    expect((await bare.json()).error).toBe(API_ERRORS.ITEM_PROPERTY_NEEDS_BASE);

    expect((await post({ action: "grant", artifactId: "ft", baseId: "ring" })).status).toBe(422);

    const ok = await post({ action: "grant", artifactId: "ft", baseId: "ls" });

    expect(ok.status).toBe(200);
    expect(tx.characterInventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stash: ["ls+ft"] }) }));
    expect(tx.inventoryLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "artifact_grant", delta: { artifactId: "ls+ft", artifactName: "Flame Tongue Longsword" } })] });
  });

  it("non-unique gear is granted to a second hero", async () => {
    tx.characterInventory.findMany.mockResolvedValue([{ characterId: "b", equipped: { weapon: "ls" }, stash: [], character: { name: "Борис" } }]);

    expect((await post({ action: "grant", artifactId: "ls" })).status).toBe(200);
  });

  it("consumable goes to items with a quantity", async () => {
    expect((await post({ action: "grant", artifactId: "pot", quantity: 2 })).status).toBe(200);
    expect(tx.characterInventory.update.mock.calls[0][0].data.items).toEqual([expect.objectContaining({ name: "Potion of Healing", quantity: 2, consumable: true, artifactId: "pot" })]);
  });

  it("attune: limit 409, stale refs do not count, in battle 409, items off 409", async () => {
    tx.characterInventory.upsert.mockResolvedValue(inv({ stash: ["ring", "ls+ft"], attuned: ["ls+ft", "gone", "x+y"] }));

    const ok = await post({ action: "attune", ref: "ring" });

    expect(ok.status).toBe(200);
    expect(tx.characterInventory.update.mock.calls[0][0].data.attuned).toEqual(["ls+ft", "ring"]);

    vi.clearAllMocks();
    tx.characterInventory.upsert.mockResolvedValue(inv({ stash: ["ring"], equipped: { weapon: "ls+ft" }, attuned: ["ls+ft"] }));
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => ({ ...inv(), ...data }));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(parseRules({ items: { enabled: true, attunementLimit: 1 } })));

    const full = await post({ action: "attune", ref: "ring" });

    expect(full.status).toBe(409);
    expect((await full.json()).error).toBe(API_ERRORS.ATTUNEMENT_LIMIT);

    vi.mocked(rejectIfInActiveBattle).mockResolvedValueOnce(NextResponse.json({ error: API_ERRORS.CHARACTER_IN_BATTLE }, { status: 409 }));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());

    expect((await post({ action: "attune", ref: "ring" })).status).toBe(409);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(parseRules({})));

    const off = await post({ action: "attune", ref: "ring" });

    expect(off.status).toBe(409);
    expect((await off.json()).error).toBe(API_ERRORS.ITEMS_DISABLED);
  });

  it("free artifacts: gear and properties stay free, property lists matching free bases", async () => {
    vi.mocked(prisma.artifact.findMany).mockResolvedValue(ROWS.map(({ id, name, icon, rarity, slot, modifiers }) => ({ id, name, icon, rarity, slot, modifiers })) as never);
    vi.mocked(prisma.characterInventory.findMany).mockResolvedValue([{ characterId: "b", equipped: { weapon: "ls+ft" }, stash: ["ring"] }] as never);

    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/free-artifacts/route");

    const res = (await mod.GET(new Request("http://x"), params)) as NextResponse;

    const free = (await res.json()) as Array<{ id: string; gear?: true; property?: { bases: string[]; nameTemplate?: string }; consumable?: true }>;

    expect(free.map((a) => a.id).sort()).toEqual(["ft", "ls", "pot", "ring"]);
    expect(free.find((a) => a.id === "ls")?.gear).toBe(true);
    expect(free.find((a) => a.id === "ft")?.property).toEqual({ nameTemplate: "Flame Tongue {base}", bases: ["ls"] });
    expect(free.find((a) => a.id === "pot")?.consumable).toBe(true);
  });
});

describe("inventory PATCH and transfer: magic items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access());
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "dm", status: "active" } as never);
    tx.characterInventory.findUnique.mockResolvedValue({ characterId: "a", equipped: {}, stash: [] });
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.characterInventory.upsert.mockImplementation(async ({ update, where }: { update?: object; where: { characterId: string } }) => ({ characterId: where.characterId, equipped: {}, stash: [], ...update }));
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => data);
    tx.artifact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => byId(where.id));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
  });

  const patch = async (body: unknown) => {
    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/inventory/route");

    return mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
  };

  it("two identical non-unique weapons may be worn when items are enabled", async () => {
    expect((await patch({ equipped: { weapon: "ls", range_weapon: "ls" } })).status).toBe(200);
  });

  it("transfer into a stash that already holds the same ref → 409", async () => {
    tx.characterInventory.upsert.mockImplementation(async ({ where }: { where: { characterId: string } }) =>
      where.characterId === "a" ? { characterId: "a", equipped: {}, stash: ["ls"], attuned: [] } : { characterId: "b", equipped: {}, stash: ["ls"], attuned: [] },
    );
    vi.mocked(prisma.character.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) => ({ id: where.id, campaignId: "camp", controlledBy: "dm", status: "active" })) as never);

    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/route");

    const res = (await mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ artifactId: "ls", toCharacterId: "b" }) }), params)) as NextResponse;

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.ITEM_ALREADY_IN_STASH);
  });
});

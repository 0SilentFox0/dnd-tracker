import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  inventoryLog: { createMany: vi.fn() },
  artifact: { findFirst: vi.fn() },
  campaign: { findUnique: vi.fn() },
  characterInventory: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: { character: { findUnique: vi.fn() }, $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)) },
}));

const params = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

const patch = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/inventory/route");

  return mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params);
};

describe("shield cell validation in inventory PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", members: [] } } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp" } as never);
    tx.characterInventory.findUnique.mockResolvedValue({ characterId: "a", equipped: { shield: "sw", helmet: "h1" }, stash: [] });
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.characterInventory.upsert.mockImplementation(async ({ update }: { update: object }) => ({ characterId: "a", ...update }));
    tx.artifact.findFirst.mockResolvedValue({ slot: "weapon", bonuses: {}, modifiers: [] });
    tx.campaign.findUnique.mockResolvedValue({ rules: {} });
  });

  it("unchanged legacy non-shield in the shield cell is accepted", async () => {
    const res = await patch({ equipped: { shield: "sw", helmet: "h2" } });

    expect(res.status).toBe(200);
  });

  it("newly set non-shield in HOMM is rejected with 422", async () => {
    const res = await patch({ equipped: { shield: "other", helmet: "h1" } });

    expect(res.status).toBe(422);
  });

  it("equipSlot with a non-shield in HOMM is rejected with 422", async () => {
    const res = await patch({ equipSlot: { slot: "shield", artifactId: "other" } });

    expect(res.status).toBe(422);
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));

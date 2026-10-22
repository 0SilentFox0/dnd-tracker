import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  inventoryLog: { createMany: vi.fn() },
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

describe("DM equip via inventory PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", members: [] } } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp" } as never);
    tx.characterInventory.findUnique.mockResolvedValue({ characterId: "a", equipped: { helmet: "h1" }, stash: ["s1"] });
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.characterInventory.upsert.mockImplementation(async ({ update }: { update: object }) => ({ characterId: "a", ...update }));
  });

  it("moves the displaced artifact to the stash and logs the swap", async () => {
    const res = await patch({ equipSlot: { slot: "helmet", artifactId: "h2" } });

    expect(res.status).toBe(200);

    const { update } = tx.characterInventory.upsert.mock.calls[0][0];

    expect(update.equipped).toEqual({ helmet: "h2" });
    expect(update.stash).toEqual(["s1", "h1"]);
    expect(tx.inventoryLog.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ campaignId: "camp", characterId: "a", actorUserId: "dm", kind: "artifact_equip", delta: { artifactId: "h2", slot: "helmet", swappedArtifactId: "h1" } })],
    });
  });

  it("an empty slot displaces nothing and writes no log", async () => {
    await patch({ equipSlot: { slot: "boots", artifactId: "s1" } });

    const { update } = tx.characterInventory.upsert.mock.calls[0][0];

    expect(update.stash).toEqual([]);
    expect(tx.inventoryLog.createMany).not.toHaveBeenCalled();
  });
});

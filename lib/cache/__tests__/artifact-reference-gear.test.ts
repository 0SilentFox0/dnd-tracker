import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    artifact: { findMany: vi.fn() },
    artifactSet: { findMany: vi.fn(async () => []) },
    characterInventory: { findMany: vi.fn() },
  },
}));

import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { prisma } from "@/lib/db";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

describe("довідник: спорядження й складені ref", () => {
  it("неунікальний — gear без власника; унікальна база в складеному ref має власника", async () => {
    vi.mocked(prisma.artifact.findMany).mockResolvedValue([
      { id: "ls", name: "Longsword", icon: null, rarity: "common", slot: "weapon", description: null, abilities: [], modifiers: itemStatsColumns({ unique: false }).modifiers, artifactSet: null },
      { id: "homm", name: "Меч", icon: null, rarity: "rare", slot: "weapon", description: null, abilities: [], modifiers: [], artifactSet: null },
    ] as never);
    vi.mocked(prisma.characterInventory.findMany).mockResolvedValue([{ equipped: { weapon: "homm+ft" }, stash: ["ls"], character: { name: "Боромир" } }] as never);

    const { artifacts } = await loadArtifactReference("c");

    expect(artifacts.find((a) => a.id === "ls")).toMatchObject({ holderName: null, gear: true });
    expect(artifacts.find((a) => a.id === "homm")).toMatchObject({ holderName: "Боромир" });
    expect(artifacts.find((a) => a.id === "homm")).not.toHaveProperty("gear");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    artifact: { findMany: vi.fn() },
    artifactSet: { findMany: vi.fn() },
    characterInventory: { findMany: vi.fn() },
  },
}));

import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { prisma } from "@/lib/db";
import { textMatching } from "@/lib/i18n/test/text";

const ability = { id: "a", name: "Сила", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

describe("довідник артефактів", () => {
  beforeEach(() => {
    vi.mocked(prisma.artifact.findMany).mockResolvedValue([
      { id: "a1", name: "Меч", icon: null, rarity: "rare", slot: "weapon", description: "d", abilities: [ability], artifactSet: { name: "Набір" } },
      { id: "a2", name: "Щит", icon: null, rarity: null, slot: "shield", description: null, abilities: [], artifactSet: null },
    ] as never);
    vi.mocked(prisma.artifactSet.findMany).mockResolvedValue([
      { id: "s1", name: "Набір", icon: null, description: null, abilities: [ability], artifacts: [{ name: "Шолом" }, { name: "Амулет" }] },
    ] as never);
    vi.mocked(prisma.characterInventory.findMany).mockResolvedValue([
      { equipped: { weapon: "a1" }, character: { name: "Боромир" } },
      { equipped: null, character: { name: "Гімлі" } },
    ] as never);
  });

  it("показує, хто носить артефакт, і вільні як null", async () => {
    const { artifacts } = await loadArtifactReference("c");

    expect(artifacts[0]).toMatchObject({ id: "a1", holderName: "Боромир", setName: "Набір", effects: [textMatching(/шкода \(ближня\) \+10%/)] });
    expect(artifacts[1]).toMatchObject({ id: "a2", holderName: null, setName: null });
  });

  it("сет: бонуси та назви артефактів за алфавітом", async () => {
    const { sets } = await loadArtifactReference("c");

    expect(sets[0].artifactNames).toEqual(["Амулет", "Шолом"]);
    expect(sets[0].bonuses).toEqual([textMatching(/шкода/)]);
  });
});

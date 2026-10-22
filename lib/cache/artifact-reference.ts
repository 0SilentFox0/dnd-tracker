import { artifactSlotLabel } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { normalizeStash } from "@/lib/utils/inventory/items";
import type { ArtifactForReference, ArtifactSetForReference } from "@/types/info-reference";

export interface ArtifactReference {
  artifacts: ArtifactForReference[];
  sets: ArtifactSetForReference[];
}

export async function loadArtifactReference(campaignId: string): Promise<ArtifactReference> {
  const [artifacts, sets, inventories] = await Promise.all([
    prisma.artifact.findMany({
      where: { campaignId },
      select: {
        id: true,
        name: true,
        icon: true,
        rarity: true,
        slot: true,
        description: true,
        abilities: true,
        artifactSet: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.artifactSet.findMany({
      where: { campaignId },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        abilities: true,
        artifacts: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.characterInventory.findMany({
      where: { character: { campaignId } },
      select: { equipped: true, stash: true, character: { select: { name: true } } },
    }),
  ]);

  const holderById = new Map<string, string>();

  for (const inv of inventories) {
    for (const id of Object.values((inv.equipped as Record<string, string | undefined> | null) ?? {})) {
      if (id) holderById.set(id, inv.character.name);
    }

    for (const id of normalizeStash(inv.stash)) holderById.set(id, inv.character.name);
  }

  return {
    artifacts: artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      rarity: a.rarity,
      slot: a.slot,
      slotLabel: artifactSlotLabel(a.slot),
      description: a.description,
      effects: abilitySummary("artifact", a),
      setName: a.artifactSet?.name ?? null,
      holderName: holderById.get(a.id) ?? null,
    })),
    sets: sets.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      bonuses: abilitySummary("artifactSet", s),
      artifactNames: s.artifacts.map((x) => x.name).sort((x, y) => x.localeCompare(y)),
    })),
  };
}

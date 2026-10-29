import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { isUniqueRow } from "@/lib/utils/items/item-row";
import { refArtifactIds } from "@/lib/utils/items/ref";
import { heldRefs } from "@/lib/utils/items/resolve";
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
        modifiers: true,
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
    for (const ref of heldRefs(inv)) for (const id of refArtifactIds(ref)) holderById.set(id, inv.character.name);
  }

  return {
    artifacts: artifacts.map((a) => {
      const gear = !isUniqueRow(a);

      return {
      id: a.id,
      name: a.name,
      icon: a.icon,
      rarity: a.rarity,
      slot: a.slot,
      description: a.description,
      effects: abilitySummary("artifact", a),
      setName: a.artifactSet?.name ?? null,
      holderName: gear ? null : (holderById.get(a.id) ?? null),
      ...(gear && { gear: true as const }),
      };
    }),
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

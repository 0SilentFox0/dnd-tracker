import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import type { EquippedArtifact } from "@/types/battle";

export type EquippedArtifactRow = { row: Prisma.ArtifactGetPayload<object>; slot: string };

export async function loadEquippedArtifactRows(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
): Promise<EquippedArtifactRow[]> {
  if (!character.inventory) return [];

  const equipped = (character.inventory.equipped as Record<string, string>) || {};

  const artifactIdToSlot: Record<string, string> = {};

  for (const [slot, artifactId] of Object.entries(equipped)) {
    if (typeof artifactId === "string" && artifactId) artifactIdToSlot[artifactId] = slot;
  }

  const artifactIds = Object.keys(artifactIdToSlot);

  if (artifactIds.length === 0) return [];

  const rows = preloadedArtifactsById
    ? artifactIds.map((id) => preloadedArtifactsById[id]).filter((a): a is NonNullable<typeof a> => a != null)
    : await prisma.artifact.findMany({ where: { id: { in: artifactIds }, campaignId: character.campaignId } });

  return rows.map((row) => ({ row, slot: artifactIdToSlot[row.id] || row.slot }));
}

export function toEquippedArtifacts(rows: EquippedArtifactRow[]): EquippedArtifact[] {
  return rows.map(({ row: artifact, slot }) => ({
    artifactId: artifact.id,
    name: artifact.name,
    slot,
    setId: artifact.setId ?? undefined,
    bonuses: (artifact.bonuses as Record<string, number>) || {},
    modifiers: (artifact.modifiers as EquippedArtifact["modifiers"]) || [],
  }));
}

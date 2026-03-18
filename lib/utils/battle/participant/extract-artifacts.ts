/**
 * Витягування екіпірованих артефактів з character.inventory
 */

import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import type { EquippedArtifact } from "@/types/battle";

/**
 * Витягує екіпіровані артефакти з character.inventory
 */
export async function extractEquippedArtifactsFromCharacter(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
): Promise<EquippedArtifact[]> {
  const equippedArtifacts: EquippedArtifact[] = [];

  if (!character.inventory) {
    return equippedArtifacts;
  }

  const equipped =
    (character.inventory.equipped as Record<string, string>) || {};

  const artifactIds: string[] = [];

  const artifactIdToSlot: Record<string, string> = {};

  for (const [slot, artifactId] of Object.entries(equipped)) {
    if (typeof artifactId === "string" && artifactId) {
      artifactIds.push(artifactId);
      artifactIdToSlot[artifactId] = slot;
    }
  }

  if (artifactIds.length === 0) {
    return equippedArtifacts;
  }

  const artifacts = preloadedArtifactsById
    ? artifactIds
        .map((id) => preloadedArtifactsById[id])
        .filter((a): a is NonNullable<typeof a> => a != null)
    : await prisma.artifact.findMany({
        where: {
          id: { in: artifactIds },
          campaignId: character.campaignId,
        },
      });

  for (const artifact of artifacts) {
    const bonuses = (artifact.bonuses as Record<string, number>) || {};

    const modifiers =
      (artifact.modifiers as Array<{
        type: string;
        value: number;
        isPercentage?: boolean;
      }>) || [];

    equippedArtifacts.push({
      artifactId: artifact.id,
      name: artifact.name,
      slot: artifactIdToSlot[artifact.id] || artifact.slot,
      bonuses,
      modifiers,
      passiveAbility: artifact.passiveAbility
        ? (artifact.passiveAbility as Record<string, unknown>)
        : undefined,
    });
  }

  return equippedArtifacts;
}

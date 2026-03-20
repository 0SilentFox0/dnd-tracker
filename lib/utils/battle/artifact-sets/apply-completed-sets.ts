/**
 * Бонуси повних сетів після збору equippedArtifacts.
 */

import type { CampaignSpellContext } from "../types/participant";
import { SET_BONUS_DEFAULT_LABEL, SYNTHETIC_SET_BONUS_ID_PREFIX } from "./constants";
import {
  type ArtifactSetBattleMaps,
  loadArtifactSetBattleMaps,
} from "./load-maps";
import { mergeArtifactSetBonusIntoParticipant } from "./merge-set-bonus";

import { parseArtifactSetBonus } from "@/lib/types/artifact-set-bonus";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

function uniqueSetIdsFromEquipped(equipped: EquippedArtifact[]): Set<string> {
  const ids = new Set<string>();

  for (const a of equipped) {
    if (a.setId) ids.add(a.setId);
  }

  return ids;
}

function isRealEquippedArtifact(a: EquippedArtifact): boolean {
  return !a.artifactId.startsWith(SYNTHETIC_SET_BONUS_ID_PREFIX);
}

/**
 * Якщо на персонажі всі частини сету — застосовує setBonus.
 */
export async function applyCompletedArtifactSets(
  participant: BattleParticipant,
  campaignId: string,
  context?: CampaignSpellContext,
): Promise<void> {
  const realEquipped = participant.battleData.equippedArtifacts.filter(
    isRealEquippedArtifact,
  );

  const equippedIds = new Set(realEquipped.map((a) => a.artifactId));

  const setIds = uniqueSetIdsFromEquipped(realEquipped);

  if (setIds.size === 0) return;

  let maps: ArtifactSetBattleMaps;

  if (
    context?.artifactSetsById &&
    context.artifactSetMemberIds &&
    Object.keys(context.artifactSetsById).length > 0
  ) {
    maps = {
      artifactSetsById: context.artifactSetsById,
      artifactSetMemberIds: context.artifactSetMemberIds,
    };
  } else {
    maps = await loadArtifactSetBattleMaps(campaignId, [...setIds]);
  }

  for (const setId of setIds) {
    const memberIds = maps.artifactSetMemberIds[setId];

    if (!memberIds?.length) continue;

    if (!memberIds.every((id) => equippedIds.has(id))) continue;

    const setRow = maps.artifactSetsById[setId];

    if (!setRow?.setBonus) continue;

    const parsed = parseArtifactSetBonus(setRow.setBonus);

    const label =
      parsed.name || setRow.name || SET_BONUS_DEFAULT_LABEL;

    mergeArtifactSetBonusIntoParticipant(participant, parsed, label);
  }
}

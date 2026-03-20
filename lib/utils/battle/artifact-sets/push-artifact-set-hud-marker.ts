/**
 * Додає маркер сету в HUD учасника (без дублікатів за setId).
 */

import type { ArtifactSetHudMarker, BattleParticipant } from "@/types/battle";

export function pushArtifactSetHudMarker(
  participant: BattleParticipant,
  marker: ArtifactSetHudMarker,
): void {
  participant.battleData.artifactSetHudMarkers ??= [];

  if (
    participant.battleData.artifactSetHudMarkers.some(
      (m) => m.setId === marker.setId,
    )
  ) {
    return;
  }

  participant.battleData.artifactSetHudMarkers.push(marker);
}

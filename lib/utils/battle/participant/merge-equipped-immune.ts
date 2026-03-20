import { mergeParticipantImmuneSpellIds } from "./extras";

import type { BattleParticipant } from "@/types/battle";

/** Імунітет з `EquippedArtifact.immuneSpellIds` (наприклад лише `effectScope.immuneSpellIds` без «аудиторії»). */
export function mergeEquippedArtifactsImmuneSpellIds(
  participant: BattleParticipant,
): void {
  for (const a of participant.battleData.equippedArtifacts) {
    mergeParticipantImmuneSpellIds(participant, a.immuneSpellIds);
  }
}

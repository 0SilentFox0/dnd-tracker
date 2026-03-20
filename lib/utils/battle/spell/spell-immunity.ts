import { getParticipantExtras } from "../participant/extras";

import type { BattleParticipant } from "@/types/battle";

export function participantImmuneToSpell(
  participant: BattleParticipant,
  spellId: string,
): boolean {
  return getParticipantExtras(participant).immuneSpellIds?.includes(spellId) ?? false;
}

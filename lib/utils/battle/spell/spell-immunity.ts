import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { BattleParticipant } from "@/types/battle";

export function participantImmuneToSpell(
  participant: BattleParticipant,
  spellId: string,
  participants: BattleParticipant[] = [participant],
): boolean {
  return findFlags(withSelf(participants, participant), participant.basicInfo.id, "spellImmunity").some((f) => f.spellIds.includes(spellId));
}

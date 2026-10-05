import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export function participantImmuneToSpell(
  participant: BattleParticipant,
  spellId: string,
  participants: BattleParticipant[] = [participant],
  extra?: StaticEffect[],
): boolean {
  return findFlags(withSelf(participants, participant), participant.basicInfo.id, "spellImmunity", extra).some((f) => f.spellIds.includes(spellId));
}

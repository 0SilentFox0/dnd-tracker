import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { combineMorale, ownTimedMoraleFlat } from "@/lib/utils/abilities/engine/morale";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { BattleParticipant } from "@/types/battle";

export function effectiveMorale(p: BattleParticipant, participants: BattleParticipant[]): { value: number; ignored: boolean } {
  const all = withSelf(participants, p);

  const id = p.basicInfo.id;

  return combineMorale(p.combatStats.morale, ownTimedMoraleFlat(p), {
    ignored: findFlags(all, id, "ignoreMorale").length > 0,
    noNegative: findFlags(all, id, "noNegativeMorale").length > 0,
  });
}

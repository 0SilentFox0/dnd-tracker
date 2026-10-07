import { collectModifiers, findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { BattleParticipant } from "@/types/battle";

export function effectiveMorale(p: BattleParticipant, participants: BattleParticipant[]): { value: number; ignored: boolean } {
  const all = withSelf(participants, p);

  const id = p.basicInfo.id;

  if (findFlags(all, id, "ignoreMorale").length > 0) return { value: 0, ignored: true };

  const raw = Math.max(-3, Math.min(3, p.combatStats.morale + collectModifiers(all, id, { stat: "morale" }).flat));

  return { value: raw < 0 && findFlags(all, id, "noNegativeMorale").length > 0 ? 0 : raw, ignored: false };
}

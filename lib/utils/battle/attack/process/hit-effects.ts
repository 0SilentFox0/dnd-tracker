/** Вампіризм: відновлення HP атакувальника від завданої шкоди (прапорець lifesteal). */

import { AttackType } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applyRawHeal } from "@/lib/utils/abilities/engine/effects/hp";
import type { BattleParticipant } from "@/types/battle";

export function applyVampirism(
  participants: BattleParticipant[],
  attackerId: string,
  totalFinalDamage: number,
  attackType: string,
): { updatedAttacker: BattleParticipant | null; vampirismHeal: number } {
  const attacker = findParticipant(participants, attackerId);

  const isMeleeOrRanged = attackType === AttackType.MELEE || attackType === AttackType.RANGED;

  if (!attacker || totalFinalDamage <= 0 || !isMeleeOrRanged) return { updatedAttacker: null, vampirismHeal: 0 };

  const percent = findFlags(participants, attackerId, "lifesteal").reduce((sum, f) => sum + f.percent, 0);

  const heal = Math.floor((totalFinalDamage * percent) / 100);

  const { participant, healed } = applyRawHeal(attacker, heal);

  if (healed <= 0) return { updatedAttacker: null, vampirismHeal: 0 };

  return { updatedAttacker: participant, vampirismHeal: healed };
}

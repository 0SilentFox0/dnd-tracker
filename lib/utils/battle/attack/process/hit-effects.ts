/** Вампіризм: відновлення HP атакувальника від завданої шкоди (прапорець lifesteal). */

import { AttackType } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import type { BattleParticipant } from "@/types/battle";

export function applyVampirism(
  participants: BattleParticipant[],
  attackerId: string,
  totalFinalDamage: number,
  attackType: string,
): { updatedAttacker: BattleParticipant | null; vampirismHeal: number } {
  const attacker = participants.find((p) => p.basicInfo.id === attackerId);

  const isMeleeOrRanged = attackType === AttackType.MELEE || attackType === AttackType.RANGED;

  if (!attacker || totalFinalDamage <= 0 || !isMeleeOrRanged) return { updatedAttacker: null, vampirismHeal: 0 };

  const percent = findFlags(participants, attackerId, "lifesteal").reduce((sum, f) => sum + f.percent, 0);

  const heal = Math.floor((totalFinalDamage * percent) / 100);

  const healed = Math.min(attacker.combatStats.maxHp, attacker.combatStats.currentHp + heal);

  if (heal <= 0 || healed <= attacker.combatStats.currentHp) return { updatedAttacker: null, vampirismHeal: 0 };

  return { updatedAttacker: { ...attacker, combatStats: { ...attacker.combatStats, currentHp: healed } }, vampirismHeal: healed - attacker.combatStats.currentHp };
}

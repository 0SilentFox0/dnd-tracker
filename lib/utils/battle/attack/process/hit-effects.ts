/** Вампіризм: відновлення HP атакувальника від завданої шкоди. */

import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function applyVampirism(
  attacker: BattleParticipant,
  totalFinalDamage: number,
  attackType: string,
): { updatedAttacker: BattleParticipant; vampirismHeal: number } {
  let vampirismHeal = 0;

  const isMeleeOrRanged =
    attackType === AttackType.MELEE || attackType === AttackType.RANGED;

  if (totalFinalDamage <= 0 || !isMeleeOrRanged) {
    return { updatedAttacker: attacker, vampirismHeal: 0 };
  }

  let vampirismPercent = 0;

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      if (d.type === "vampirism" && typeof d.value === "number") {
        vampirismPercent += d.isPercentage ? d.value : 0;
      }
    }
  }

  if (vampirismPercent > 0) {
    vampirismHeal = Math.floor((totalFinalDamage * vampirismPercent) / 100);

    if (vampirismHeal > 0) {
      const updatedAttacker = {
        ...attacker,
        combatStats: {
          ...attacker.combatStats,
          currentHp: Math.min(
            attacker.combatStats.maxHp,
            attacker.combatStats.currentHp + vampirismHeal,
          ),
        },
      };

      return { updatedAttacker, vampirismHeal };
    }
  }

  return { updatedAttacker: attacker, vampirismHeal: 0 };
}

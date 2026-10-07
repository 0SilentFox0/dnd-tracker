import { CombatStatus } from "@/lib/constants/battle";
import type { BattleParticipant, BattleParticipantCombatStats } from "@/types/battle";

export function downStatus(hp: number): BattleParticipantCombatStats["status"] {
  return hp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS;
}

export function applyRawDamage(p: BattleParticipant, amount: number): BattleParticipant {
  const fromTemp = Math.min(p.combatStats.tempHp, amount);

  const hp = Math.max(0, p.combatStats.currentHp - (amount - fromTemp));

  return {
    ...p,
    combatStats: {
      ...p.combatStats,
      tempHp: p.combatStats.tempHp - fromTemp,
      currentHp: hp,
      status: hp <= 0 ? downStatus(hp) : p.combatStats.status,
    },
  };
}

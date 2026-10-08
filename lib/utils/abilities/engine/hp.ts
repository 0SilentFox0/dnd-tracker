import { CombatStatus } from "@/lib/constants/battle";
import type { BattleParticipant, BattleParticipantCombatStats } from "@/types/battle";

export function downStatus(hp: number): BattleParticipantCombatStats["status"] {
  return hp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS;
}

export function dropBreakOnDamage(p: BattleParticipant, damage: number): BattleParticipant {
  if (damage <= 0 || !p.battleData.activeEffects.some((e) => e.breakOnDamage)) return p;

  return { ...p, battleData: { ...p.battleData, activeEffects: p.battleData.activeEffects.filter((e) => !e.breakOnDamage) } };
}

export function applyRawDamage(p: BattleParticipant, amount: number): BattleParticipant {
  const fromTemp = Math.min(p.combatStats.tempHp, amount);

  const hp = Math.max(0, p.combatStats.currentHp - (amount - fromTemp));

  return dropBreakOnDamage(
    {
      ...p,
      combatStats: {
        ...p.combatStats,
        tempHp: p.combatStats.tempHp - fromTemp,
        currentHp: hp,
        status: hp <= 0 ? downStatus(hp) : p.combatStats.status,
      },
    },
    amount,
  );
}

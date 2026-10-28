import { CombatStatus } from "@/lib/constants/battle";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { clearDeathSaves } from "@/lib/utils/battle/death-saves";
import type { BattleParticipant, BattleParticipantCombatStats } from "@/types/battle";

function downStatus(hp: number): BattleParticipantCombatStats["status"] {
  return hp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS;
}

export function dropBreakOnDamage(p: BattleParticipant, damage: number): BattleParticipant {
  if (damage <= 0) return p;

  return removeEffects(p, (e) => !!e.breakOnDamage).participant;
}

export function applyRawHeal(p: BattleParticipant, amount: number): { participant: BattleParticipant; healed: number } {
  const healed = Math.max(0, Math.min(amount, p.combatStats.maxHp - p.combatStats.currentHp));

  if (healed === 0) return { participant: p, healed };

  const hp = p.combatStats.currentHp + healed;

  const healedP = { ...p, combatStats: { ...p.combatStats, currentHp: hp } };

  return { participant: hp > 0 && p.battleData.deathSaves ? { ...clearDeathSaves(healedP), combatStats: { ...healedP.combatStats, status: CombatStatus.ACTIVE } } : healedP, healed };
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

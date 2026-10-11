import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { LIVE_SCALE_STEP } from "@/lib/constants/battle-balance";
import type { BattleParticipant } from "@/types/battle";

export type LiveScaleDirection = "buff" | "debuff";

export function isLiveScalable(p: BattleParticipant): boolean {
  return p.basicInfo.sourceType === ParticipantSourceType.UNIT && p.basicInfo.side === ParticipantSide.ENEMY && p.combatStats.status !== CombatStatus.DEAD;
}

/** Множить HP і шкоду живих ворожих юнітів лише в цьому бою; формула рівного бою не змінюється. */
export function liveScaleEnemyUnits(participants: BattleParticipant[], direction: LiveScaleDirection): { participants: BattleParticipant[]; scaled: string[] } {
  const factor = direction === "buff" ? LIVE_SCALE_STEP : 1 / LIVE_SCALE_STEP;

  const scaled: string[] = [];

  const next = participants.map((p) => {
    if (!isLiveScalable(p)) return p;

    scaled.push(p.basicInfo.name);

    const { maxHp, currentHp } = p.combatStats;

    const newMax = Math.max(1, Math.round(maxHp * factor));

    const newCurrent = currentHp <= 0 ? currentHp : Math.min(newMax, Math.max(1, Math.round(currentHp * factor)));

    return {
      ...p,
      combatStats: { ...p.combatStats, maxHp: newMax, currentHp: newCurrent },
      battleData: {
        ...p.battleData,
        hpMultiplier: (p.battleData.hpMultiplier ?? 1) * factor,
        damageMultiplier: (p.battleData.damageMultiplier ?? 1) * factor,
      },
    };
  });

  return { participants: next, scaled };
}

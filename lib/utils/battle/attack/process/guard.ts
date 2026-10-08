import { GUARD_KEY } from "@/lib/utils/abilities/engine/marks";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import type { BattleParticipant } from "@/types/battle";

export interface GuardSplit {
  targetDamage: number;
  guardianId: string | null;
  guardianDamage: number;
}

export function splitGuardedDamage(ps: BattleParticipant[], targetId: string, damage: number): GuardSplit {
  const none = { targetDamage: damage, guardianId: null, guardianDamage: 0 };

  const target = findParticipant(ps, targetId);

  if (!target || damage <= 0) return none;

  for (const e of target.battleData.activeEffects) {
    const guardianId = e.source?.participantId;

    const percent = e.effects.find((x) => x.type === GUARD_KEY)?.value;

    if (e.abilityKey !== GUARD_KEY || !guardianId || guardianId === targetId || !percent) continue;

    const guardian = findParticipant(ps, guardianId);

    if (!guardian || !isActive(guardian)) continue;

    const guardianDamage = Math.floor((damage * percent) / 100);

    if (guardianDamage === 0) continue;

    return { targetDamage: damage - guardianDamage, guardianId, guardianDamage };
  }

  return none;
}

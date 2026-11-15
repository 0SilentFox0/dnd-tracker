import { clearDeathSaves, deathSavesOf } from './state';

import { CombatStatus } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

/** `combat.onRevived`: a hero raised above 0 HP leaves the dying state */
export function reviveFromDying(p: BattleParticipant): BattleParticipant {
    if (!deathSavesOf(p)) return p;

    const woke = clearDeathSaves(p);

    return {
        ...woke,
        combatStats: { ...woke.combatStats, status: CombatStatus.ACTIVE },
    };
}

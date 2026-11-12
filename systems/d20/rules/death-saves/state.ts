import { CombatStatus } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

export const DEATH_SAVES_TIMED_KEY = 'death-saves:unconscious';

export const FRESH_DEATH_SAVES = { successes: 0, failures: 0, stable: false };

export function clearDeathSaves(p: BattleParticipant): BattleParticipant {
    if (!p.battleData.deathSaves) return p;

    const { deathSaves: _removed, ...battleData } = p.battleData;

    return {
        ...p,
        battleData: {
            ...battleData,
            activeEffects: battleData.activeEffects.filter(
                (e) => e.abilityKey !== DEATH_SAVES_TIMED_KEY
            ),
        },
    };
}

/** `combat.onRevived`: a hero raised above 0 HP leaves the dying state */
export function reviveFromDying(p: BattleParticipant): BattleParticipant {
    if (!p.battleData.deathSaves) return p;

    const woke = clearDeathSaves(p);

    return {
        ...woke,
        combatStats: { ...woke.combatStats, status: CombatStatus.ACTIVE },
    };
}

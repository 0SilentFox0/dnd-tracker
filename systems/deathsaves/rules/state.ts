import { d20State, d20StateData, type DeathSaves } from '@/systems/d20/rules/state';
import type { BattleParticipant } from '@/types/battle';

export const DEATH_SAVES_TIMED_KEY = 'death-saves:unconscious';

export const FRESH_DEATH_SAVES = { successes: 0, failures: 0, stable: false };

export const deathSavesOf = (p: BattleParticipant): DeathSaves | undefined =>
    d20State(p).deathSaves;

/** Counters live in the d20 slot; the neutral `dying` flag lets core ask "who lies at 0 HP" without knowing them */
export const withDeathSaves = (
    p: BattleParticipant,
    saves: DeathSaves | undefined
): BattleParticipant => ({
    ...p,
    battleData: {
        ...p.battleData,
        ...d20StateData(p, { deathSaves: saves }),
        ...(saves
            ? { dying: true as const }
            : p.battleData.dying !== undefined && { dying: undefined }),
    },
});

export function clearDeathSaves(p: BattleParticipant): BattleParticipant {
    if (!deathSavesOf(p)) return p;

    const cleared = withDeathSaves(p, undefined);

    return {
        ...cleared,
        battleData: {
            ...cleared.battleData,
            activeEffects: cleared.battleData.activeEffects.filter(
                (e) => e.abilityKey !== DEATH_SAVES_TIMED_KEY
            ),
        },
    };
}

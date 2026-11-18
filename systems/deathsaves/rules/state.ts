import { isRecord } from '@/lib/utils/common/is-record';
import {
    d20State,
    d20StateData,
    registerD20Ext,
} from '@/systems/d20/rules/state';
import type { BattleParticipant } from '@/types/battle';

export interface DeathSaves {
    successes: number;
    failures: number;
    stable: boolean;
}

declare module '@/systems/d20/rules/state' {
    interface D20ParticipantState {
        deathSaves?: DeathSaves;
    }
}

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

const parseDeathSaves = (raw: unknown): DeathSaves | undefined =>
    isRecord(raw) && finite(raw.successes) && finite(raw.failures)
        ? {
              successes: raw.successes,
              failures: raw.failures,
              stable: raw.stable === true,
          }
        : undefined;

registerD20Ext({
    key: 'deathsaves',
    legacy: ['deathSaves'],
    read: (ext, raw) => {
        const deathSaves = parseDeathSaves(
            ext !== undefined ? ext : raw.deathSaves
        );

        return deathSaves ? { deathSaves } : {};
    },
    write: (state) => state.deathSaves,
});

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

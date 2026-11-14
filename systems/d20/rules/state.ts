import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

export interface DeathSaves {
    successes: number;
    failures: number;
    stable: boolean;
}

export interface D20ParticipantState {
    deathSaves?: DeathSaves;
    inspiration?: true;
    inspirationSpent?: true;
    attackedWithLight?: true;
}

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

export const D20_STATE = defineSlot<D20ParticipantState>('d20', (raw) => {
    if (!isRecord(raw)) return undefined;

    const saves = raw.deathSaves;

    return {
        ...(isRecord(saves) &&
            finite(saves.successes) &&
            finite(saves.failures) && {
                deathSaves: {
                    successes: saves.successes,
                    failures: saves.failures,
                    stable: saves.stable === true,
                },
            }),
        ...(raw.inspiration === true && { inspiration: true as const }),
        ...(raw.inspirationSpent === true && {
            inspirationSpent: true as const,
        }),
        ...(raw.attackedWithLight === true && {
            attackedWithLight: true as const,
        }),
    };
});

export const d20State = (p: BattleParticipant): D20ParticipantState =>
    D20_STATE.read(p.battleData.system) ?? {};

/** A `patch` key set to `undefined` drops the field; an empty state is never written into a missing slot */
export function d20StateData(
    p: BattleParticipant,
    patch: Partial<D20ParticipantState>
): Partial<BattleData> {
    const data = Object.fromEntries(
        Object.entries({ ...d20State(p), ...patch }).filter(
            ([, v]) => v !== undefined
        )
    ) as D20ParticipantState;

    const hasSlot = D20_STATE.read(p.battleData.system) !== undefined;

    if (!hasSlot && Object.keys(data).length === 0) return {};

    return { system: D20_STATE.write(data, p.battleData.system) };
}

export const withD20State = (
    p: BattleParticipant,
    patch: Partial<D20ParticipantState>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, ...d20StateData(p, patch) },
});

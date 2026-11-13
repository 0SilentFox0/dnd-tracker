import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

export type DeathSaves = NonNullable<BattleData['deathSaves']>;

export interface D20ParticipantState {
    deathSaves?: DeathSaves;
    inspiration?: true;
    inspirationSpent?: true;
    attackedWithLight?: true;
}

const isRec = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

export const D20_STATE = defineSlot<D20ParticipantState>('d20', (raw) => {
    if (!isRec(raw)) return undefined;

    const saves = raw.deathSaves;

    return {
        ...(isRec(saves) &&
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

const LEGACY_KEYS = [
    'deathSaves',
    'inspiration',
    'inspirationSpent',
    'attackedWithLight',
] as const satisfies ReadonlyArray<keyof BattleData>;

/** The slot wins whenever it carries our key; otherwise the pre-slot flat fields are read */
export function d20State(p: BattleParticipant): D20ParticipantState {
    const slot = D20_STATE.read(p.battleData.system);

    if (slot) return slot;

    const { deathSaves, inspiration, inspirationSpent, attackedWithLight } =
        p.battleData;

    return {
        ...(deathSaves && { deathSaves }),
        ...(inspiration === true && { inspiration: true as const }),
        ...(inspirationSpent === true && { inspirationSpent: true as const }),
        ...(attackedWithLight === true && {
            attackedWithLight: true as const,
        }),
    };
}

const clearedLegacy = (p: BattleParticipant): Partial<BattleData> =>
    Object.fromEntries(
        LEGACY_KEYS.filter((k) => p.battleData[k] !== undefined).map((k) => [
            k,
            undefined,
        ])
    ) as Partial<BattleData>;

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

    const cleared = clearedLegacy(p);

    const hasSlot = D20_STATE.read(p.battleData.system) !== undefined;

    if (!hasSlot && Object.keys(data).length === 0) return cleared;

    return {
        ...cleared,
        ...(!hasSlot && data.deathSaves && { dying: true as const }),
        system: D20_STATE.write(data, p.battleData.system),
    };
}

export const withD20State = (
    p: BattleParticipant,
    patch: Partial<D20ParticipantState>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, ...d20StateData(p, patch) },
});

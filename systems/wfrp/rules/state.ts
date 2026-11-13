import { PARTICIPANT_STATE, type WfrpParticipantState } from './slots';

import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

const LEGACY_KEYS = [
    'fortune',
    'channelledSl',
    'sin',
    'conditionTests',
    'psychologyTested',
] as const satisfies ReadonlyArray<keyof WfrpParticipantState>;

/** The slot wins whenever it carries our key; otherwise the pre-slot flat fields are read */
export function wfrpState(p: BattleParticipant): WfrpParticipantState {
    const slot = PARTICIPANT_STATE.read(p.battleData.system);

    if (slot) return slot;

    return Object.fromEntries(
        LEGACY_KEYS.flatMap((k) =>
            p.battleData[k] === undefined ? [] : [[k, p.battleData[k]]]
        )
    ) as WfrpParticipantState;
}

/** A `patch` key set to `undefined` drops the field; an empty state is never written into a missing slot */
export function wfrpStateData(
    p: BattleParticipant,
    patch: Partial<WfrpParticipantState>
): Partial<BattleData> {
    const data = Object.fromEntries(
        Object.entries({ ...wfrpState(p), ...patch }).filter(
            ([, v]) => v !== undefined
        )
    ) as WfrpParticipantState;

    const cleared = Object.fromEntries(
        LEGACY_KEYS.filter((k) => p.battleData[k] !== undefined).map((k) => [
            k,
            undefined,
        ])
    ) as Partial<BattleData>;

    const hasSlot = PARTICIPANT_STATE.read(p.battleData.system) !== undefined;

    if (!hasSlot && Object.keys(data).length === 0) return cleared;

    return {
        ...cleared,
        system: PARTICIPANT_STATE.write(data, p.battleData.system),
    };
}

export const withWfrpState = (
    p: BattleParticipant,
    patch: Partial<WfrpParticipantState>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, ...wfrpStateData(p, patch) },
});

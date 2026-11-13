import { PARTICIPANT_STATE, type WfrpParticipantState } from './slots';

import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

export const wfrpState = (p: BattleParticipant): WfrpParticipantState =>
    PARTICIPANT_STATE.read(p.battleData.system) ?? {};

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

    const hasSlot = PARTICIPANT_STATE.read(p.battleData.system) !== undefined;

    if (!hasSlot && Object.keys(data).length === 0) return {};

    return { system: PARTICIPANT_STATE.write(data, p.battleData.system) };
}

export const withWfrpState = (
    p: BattleParticipant,
    patch: Partial<WfrpParticipantState>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, ...wfrpStateData(p, patch) },
});

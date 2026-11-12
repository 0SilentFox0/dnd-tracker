import type { BattleParticipant } from '@/types/battle';

export const isReserved = (p: BattleParticipant): boolean =>
    p.battleData.reserved === true;

export const reserveOf = (pending: BattleParticipant[]): BattleParticipant[] =>
    pending.filter(isReserved);

export const summonsOf = (pending: BattleParticipant[]): BattleParticipant[] =>
    pending.filter((p) => !isReserved(p));

export const toReserve = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, reserved: true },
});

/** Off the map and out of the order: the position and per-field state go; «reveal» places the unit again. */
export function returnedToReserve(p: BattleParticipant): BattleParticipant {
    const {
        position: _position,
        dormant: _dormant,
        mazeWakeRound: _wake,
        facing: _facing,
        revealPending: _pending,
        ...battleData
    } = p.battleData;

    return toReserve({ ...p, battleData });
}

export function dropBattleFlag(
    p: BattleParticipant,
    key: 'reserved' | 'revealPending'
): BattleParticipant {
    const battleData = { ...p.battleData };

    delete battleData[key];

    return { ...p, battleData };
}

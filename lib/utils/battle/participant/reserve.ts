import type {
    BattleParticipant,
    BattlePreparationParticipant,
} from '@/types/battle';

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

export const reserveStub = (p: BattleParticipant): BattleParticipant =>
    ({
        basicInfo: { id: p.basicInfo.id, side: p.basicInfo.side },
        battleData: { reserved: true },
    }) as unknown as BattleParticipant;

export const stubReserve = (pending: BattleParticipant[]): BattleParticipant[] =>
    pending.some(isReserved)
        ? pending.map((p) => (isReserved(p) ? reserveStub(p) : p))
        : pending;

/** Players must not learn how many units the DM holds in reserve. */
export function publicSetup(
    setup: BattlePreparationParticipant[]
): BattlePreparationParticipant[] {
    if (!setup.some((s) => s.reserved)) return setup;

    return setup.flatMap(({ reserved, ...rest }) => {
        const quantity = (rest.quantity ?? 1) - (reserved ?? 0);

        return quantity > 0 ? [{ ...rest, quantity }] : [];
    });
}

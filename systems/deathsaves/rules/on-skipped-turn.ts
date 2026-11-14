import { rollDyingAt } from './roll';

import type { TurnHook, TurnSubjectCtx } from '@/lib/utils/rules/systems/types';

export const deathSaveOnSkip: TurnHook<TurnSubjectCtx> = ({
    participants,
    id,
    rules,
    rng,
}) => {
    const rolled = rollDyingAt(
        participants,
        participants.findIndex((p) => p.basicInfo.id === id),
        rules,
        rng
    );

    return rolled
        ? { ...rolled, skipTurn: true }
        : { participants, messages: [] };
};

import { wfrpState, withWfrpState } from '../state';

import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { DamagedHook } from '@/lib/utils/rules/systems/types';

export const wfrpLoseChannelled: DamagedHook = (ctx, result) => {
    const { participant } = result;

    const state = wfrpState(participant);

    if (ctx.amount <= 0 || !(state.channelledSl || state.momentum))
        return result;

    const dropped = withWfrpState(participant, {
        channelledSl: undefined,
        momentum: undefined,
    });

    return {
        ...result,
        participant: dropped,
        participants: replaceParticipant(result.participants, dropped),
    };
};

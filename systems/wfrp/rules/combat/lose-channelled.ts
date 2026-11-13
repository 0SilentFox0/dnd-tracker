import { wfrpState, withWfrpState } from '../state';

import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { DamagedHook } from '@/lib/utils/rules/systems/types';

export const wfrpLoseChannelled: DamagedHook = (ctx, result) => {
    const { participant } = result;

    if (ctx.amount <= 0 || !wfrpState(participant).channelledSl) return result;

    const dropped = withWfrpState(participant, { channelledSl: undefined });

    return {
        ...result,
        participant: dropped,
        participants: replaceParticipant(result.participants, dropped),
    };
};

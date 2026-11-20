import { editionOf } from '../edition';
import { channelShock } from '../magic/channel-loss';
import { wfrpState, withWfrpState } from '../state';

import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { DamagedHook } from '@/lib/utils/rules/systems/types';

export const wfrpLoseChannelled: DamagedHook = (ctx, result) => {
    const { participant } = result;

    const state = wfrpState(participant);

    if (ctx.amount <= 0 || !(state.channelledSl || state.momentum))
        return result;

    const canon = editionOf(ctx.rules).magicModel === 'canon5e';

    const dropped = withWfrpState(participant, {
        ...(!canon && { channelledSl: undefined }),
        momentum: undefined,
    });

    const base = {
        ...result,
        participant: dropped,
        participants: replaceParticipant(result.participants, dropped),
    };

    if (!canon || !state.channelledSl) return base;

    const shock = channelShock(base.participants, dropped.basicInfo.id, {
        rules: ctx.rules,
        rng: ctx.rng,
        round: ctx.round ?? 0,
    });

    return {
        ...base,
        participant:
            shock.participants.find(
                (p) => p.basicInfo.id === dropped.basicInfo.id
            ) ?? dropped,
        participants: shock.participants,
        messages: [...base.messages, ...shock.messages],
    };
};

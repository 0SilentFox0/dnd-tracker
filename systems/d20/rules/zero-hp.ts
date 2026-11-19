import { dropBrokenConcentration } from './concentration/damaged';
import { regenGoesDown } from './regen-down';

import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { DamageConsequencesResult } from '@/lib/utils/battle/damage/consequences';
import type { ZeroHpCtx } from '@/lib/utils/rules/systems/types';

export function d20OnZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult {
    const { after, participants, rules } = ctx;

    if (!ctx.manual)
        return (
            regenGoesDown(ctx) ?? {
                participant: after,
                participants,
                messages: [],
            }
        );

    if (!rules.concentration.enabled)
        return {
            participant:
                findParticipant(participants, after.basicInfo.id) ?? after,
            participants,
            messages: [],
        };

    const dropped = dropBrokenConcentration(after, participants);

    return {
        participant:
            findParticipant(dropped.participants, after.basicInfo.id) ?? after,
        participants: dropped.participants,
        messages: dropped.messages,
    };
}

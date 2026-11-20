import { editionOf } from '../edition';
import { channelShock } from '../magic/channel-loss';
import { wfrpState } from '../state';
import { applyWfrpCondition } from './apply';
import type { WfrpConditionKey } from './catalog';
import { conditionLevel } from './levels';

import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type {
    SystemConditionApply,
    SystemConditionResult,
} from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

/** A newly applied Condition on a channelling caster calls for a Hard Cool test, canon5e (p236) */
export function applyWfrpConditionShocking(
    ps: BattleParticipant[],
    id: string,
    input: SystemConditionApply
): SystemConditionResult {
    const before = findParticipant(ps, id);

    const out = applyWfrpCondition(ps, id, input);

    const key = input.key as WfrpConditionKey;

    const after = findParticipant(out.participants, id);

    if (
        !before ||
        !after ||
        !input.rules ||
        !input.rng ||
        editionOf(input.rules).magicModel !== 'canon5e' ||
        !wfrpState(after).channelledSl ||
        conditionLevel(after, key) <= conditionLevel(before, key)
    )
        return out;

    const shock = channelShock(out.participants, id, {
        rules: input.rules,
        rng: input.rng,
        round: input.round,
    });

    return {
        participants: shock.participants,
        messages: [...out.messages, ...shock.messages],
    };
}

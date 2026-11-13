import { moraleOutcome } from '@/lib/utils/battle/flows/turn-flow';
import type { PendingMoraleCheckPayload } from '@/lib/utils/battle/morale/threshold';
import type { TurnStartCheck } from '@/lib/utils/rules/systems/types';

export const moraleOutcomeOf: TurnStartCheck['outcomeOf'] = (
    pending,
    participantId
) => {
    const payload = pending as PendingMoraleCheckPayload | null;

    return payload?.participantId === participantId
        ? moraleOutcome(payload.moraleResult)
        : undefined;
};

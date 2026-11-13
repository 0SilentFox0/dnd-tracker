import type { TurnGateOutcome } from '@/lib/utils/battle/flows/turn-flow';
import type {
    MoraleCheckResult,
    PendingMoraleCheckPayload,
} from '@/lib/utils/battle/morale/threshold';
import type { TurnStartCheck } from '@/lib/utils/rules/systems/types';

export function moraleOutcome(
    r:
        | Pick<MoraleCheckResult, 'hasExtraTurn' | 'shouldSkipTurn'>
        | null
        | undefined
): TurnGateOutcome {
    return r?.hasExtraTurn ? 'extra' : r?.shouldSkipTurn ? 'skip' : 'none';
}

export const moraleOutcomeOf: TurnStartCheck['outcomeOf'] = (
    pending,
    participantId
) => {
    const payload = pending as PendingMoraleCheckPayload | null;

    return payload?.participantId === participantId
        ? moraleOutcome(payload.moraleResult)
        : undefined;
};

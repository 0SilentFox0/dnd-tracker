import type { TurnGateOutcome } from '@/lib/utils/battle/flows/turn-flow';
import type { TurnStartCheck } from '@/lib/utils/rules/systems/types';
import type {
    MoraleCheckResult,
    PendingMoraleCheckPayload,
} from '@/systems/morale/rules/threshold';

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

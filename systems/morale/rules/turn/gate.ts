import { REJECT } from '@/lib/utils/battle/store/reject';
import type { ActGate } from '@/lib/utils/rules/systems/types';
import { awaitsMoraleCheck } from '@/systems/morale/rules/awaits-check';
import type { PendingMoraleCheckPayload } from '@/systems/morale/rules/threshold';

export function isPanicking(
    pendingMoraleCheck: unknown,
    participantId: string
): boolean {
    const pending = pendingMoraleCheck as PendingMoraleCheckPayload | null;

    return (
        pending?.participantId === participantId &&
        pending.moraleResult.shouldSkipTurn
    );
}

export const moraleGate: ActGate = (
    scope,
    participantId,
    { phase, skipCheck }
) => {
    if (
        (phase === 'end' || !skipCheck) &&
        awaitsMoraleCheck(scope, participantId)
    )
        return { code: 'action_rejected', key: REJECT.moraleFirst };

    if (
        phase === 'act' &&
        isPanicking(scope.scene.pendingMoraleCheck, participantId)
    )
        return { code: 'action_used', key: REJECT.panicSkip };

    return null;
};

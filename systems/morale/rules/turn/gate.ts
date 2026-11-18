import { REJECT } from '@/lib/utils/battle/store/reject';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { ActGate } from '@/lib/utils/rules/systems/types';
import { awaitsMoraleCheck } from '@/systems/morale/rules/awaits-check';
import { pendingMoraleOf } from '@/systems/morale/rules/state';

export function isPanicking(
    sceneState: SystemSlot | undefined,
    participantId: string
): boolean {
    const pending = pendingMoraleOf(sceneState);

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
        isPanicking(scope.scene.sceneState, participantId)
    )
        return { code: 'action_used', key: REJECT.panicSkip };

    return null;
};

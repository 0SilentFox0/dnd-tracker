import { effectiveMorale } from './effective-morale';

import { currentOf } from '@/lib/utils/battle/common/control';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import { pendingMoraleOf } from '@/systems/morale/rules/state';
import type { BattleParticipant } from '@/types/battle';

export interface MoraleScope {
    participants: BattleParticipant[];
    scene: { turnIndex: number; sceneState?: SystemSlot };
}

// morale may change mid-turn (kill, ability); the check is needed only before the first action
const hasActedThisTurn = (p: BattleParticipant) =>
    p.actionFlags.hasUsedAction ||
    p.actionFlags.hasUsedBonusAction ||
    (p.battleData.movementUsed ?? 0) > 0 ||
    !!p.battleData.returnedThisTurn;

export function awaitsMoraleCheck(
    scope: MoraleScope,
    participantId: string
): boolean {
    const current = currentOf(scope);

    if (
        !current ||
        current.basicInfo.id !== participantId ||
        current.battleData.extraTurnActive ||
        hasActedThisTurn(current)
    )
        return false;

    if (pendingMoraleOf(scope.scene.sceneState)?.participantId === participantId)
        return false;

    return effectiveMorale(current, scope.participants).value !== 0;
}

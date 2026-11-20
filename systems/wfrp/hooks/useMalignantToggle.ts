'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { malignantOp } from '@/systems/wfrp/api/battle';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

export function useMalignantToggle(participant: BattleParticipant) {
    const { battle, actions } = useBattleScene();

    const on = wfrpState(participant).malignant === true;

    return {
        available: editionOf(battle.rules).magicModel === 'canon5e',
        on,
        isPending: isSystemActionPending(actions.system, 'malignant'),
        toggle: () =>
            actions.system.mutate(malignantOp(participant.basicInfo.id, !on)),
    };
}

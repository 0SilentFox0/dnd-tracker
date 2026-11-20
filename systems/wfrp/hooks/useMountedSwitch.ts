'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { mountedOp } from '@/systems/wfrp/api/battle';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

export function useMountedSwitch(participant: BattleParticipant) {
    const { battle, actions } = useBattleScene();

    const id = participant.basicInfo.id;

    return {
        available: editionOf(battle.rules).actionsModel === 'canon',
        mountId: wfrpState(participant).mounted?.mountId ?? '',
        mounts: battle.initiativeOrder
            .filter((p) => p.basicInfo.id !== id && isActive(p))
            .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name })),
        isPending: isSystemActionPending(actions.system, 'mounted'),
        set: (mountId?: string) =>
            actions.system.mutate(mountedOp(id, mountId)),
    };
}

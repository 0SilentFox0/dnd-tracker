'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { momentumOp } from '@/systems/wfrp/api/battle';
import {
    hasMomentum,
    type SecondAttackBlocker,
    secondAttackBlocker,
} from '@/systems/wfrp/rules/combat/momentum';
import { editionOf } from '@/systems/wfrp/rules/edition';
import type { BattleParticipant } from '@/types/battle';

export interface MomentumPanel {
    blocker: SecondAttackBlocker | null;
    allies: { id: string; name: string }[];
    secondAttack(): void;
    leadership(allyId: string, roll?: number): void;
    isPending: boolean;
}

/** Null unless it is the holder's turn, the edition keeps Momentum per participant and the hero holds it. */
export function useMomentumPanel(
    hero: BattleParticipant
): MomentumPanel | null {
    const { battle, turn, actions } = useBattleScene();

    if (
        editionOf(battle.rules).momentumModel !== 'participant' ||
        !hasMomentum(hero) ||
        turn.current?.basicInfo.id !== hero.basicInfo.id
    )
        return null;

    const participantId = hero.basicInfo.id;

    return {
        blocker: secondAttackBlocker(hero),
        allies: battle.initiativeOrder
            .filter(
                (p) =>
                    p.basicInfo.id !== participantId &&
                    p.basicInfo.side === hero.basicInfo.side &&
                    isActive(p)
            )
            .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name })),
        secondAttack: () =>
            actions.system.mutate(
                momentumOp({ mode: 'secondAttack', participantId })
            ),
        leadership: (allyId, roll) =>
            actions.system.mutate(
                momentumOp({
                    mode: 'leadership',
                    participantId,
                    allyId,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        isPending: isSystemActionPending(actions.system, 'momentum'),
    };
}

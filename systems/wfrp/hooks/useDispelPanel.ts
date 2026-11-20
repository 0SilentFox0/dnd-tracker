'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { dispelOp } from '@/systems/wfrp/api/battle';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { canDispel } from '@/systems/wfrp/rules/magic/dispel';
import { dispelSpotOf, isDispelRange } from '@/systems/wfrp/rules/magic/dispel-range';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

export interface DispelTarget {
    key: string;
    targetId: string;
    mode: 'reactive' | 'persistent';
    spell: string;
    caster: string;
}

export interface DispelPanel {
    targets: DispelTarget[];
    dispel(target: DispelTarget): void;
    isPending: boolean;
}

/** Null outside canon5e or when nothing can be dispelled by this hero right now. */
export function useDispelPanel(hero: BattleParticipant): DispelPanel | null {
    const { battle, turn, actions } = useBattleScene();

    if (
        editionOf(battle.rules).magicModel !== 'canon5e' ||
        !isActive(hero) ||
        !canDispel(hero)
    )
        return null;

    const { sustain } = ruleSystemOf(battle.rules).magic;

    const ownTurn = turn.current?.basicInfo.id === hero.basicInfo.id;

    const reactiveSpent = wfrpState(hero).dispelRound === battle.currentRound;

    const targets = battle.initiativeOrder.flatMap((p): DispelTarget[] => {
        const inRange = (mode: DispelTarget['mode']) =>
            isDispelRange(
                hero,
                dispelSpotOf(p, mode),
                battle.map,
                battle.rules
            );

        const last = wfrpState(p).lastCast;

        const held = sustain.info(p);

        return [
            ...(last &&
            p.basicInfo.id !== hero.basicInfo.id &&
            !reactiveSpent &&
            inRange('reactive')
                ? [
                      {
                          key: `r:${p.basicInfo.id}`,
                          targetId: p.basicInfo.id,
                          mode: 'reactive' as const,
                          spell: last.spell,
                          caster: p.basicInfo.name,
                      },
                  ]
                : []),
            ...(held?.cn &&
            ownTurn &&
            !hero.actionFlags.hasUsedAction &&
            inRange('persistent')
                ? [
                      {
                          key: `p:${p.basicInfo.id}`,
                          targetId: p.basicInfo.id,
                          mode: 'persistent' as const,
                          spell: held.spellName,
                          caster: p.basicInfo.name,
                      },
                  ]
                : []),
        ];
    });

    if (targets.length === 0) return null;

    return {
        targets,
        dispel: ({ targetId, mode }) =>
            actions.system.mutate(
                dispelOp({
                    participantId: hero.basicInfo.id,
                    targetId,
                    mode,
                    serverRoll: true,
                })
            ),
        isPending: isSystemActionPending(actions.system, 'dispel'),
    };
}

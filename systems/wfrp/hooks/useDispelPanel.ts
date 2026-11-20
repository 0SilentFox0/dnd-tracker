'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { dispelOp } from '@/systems/wfrp/api/battle';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { canDispel } from '@/systems/wfrp/rules/magic/dispel';
import {
    dispelSpotsOf,
    isDispelRange,
} from '@/systems/wfrp/rules/magic/dispel-range';
import type { BattleParticipant } from '@/types/battle';

export interface DispelTarget {
    key: string;
    targetId: string;
    mode: 'persistent';
    spell: string;
    caster: string;
}

export interface DispelPanel {
    targets: DispelTarget[];
    dispel(target: DispelTarget): void;
    isPending: boolean;
}

/** Persistent Dispel only; a reactive one is an offer in the counter window. Null when nothing can be unravelled right now. */
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

    const targets = battle.initiativeOrder.flatMap((p): DispelTarget[] => {
        const held = sustain.info(p);

        return held?.cn &&
            ownTurn &&
            !hero.actionFlags.hasUsedAction &&
            isDispelRange(hero, dispelSpotsOf(p), battle.map, battle.rules)
            ? [
                  {
                      key: `p:${p.basicInfo.id}`,
                      targetId: p.basicInfo.id,
                      mode: 'persistent',
                      spell: held.spellName,
                      caster: p.basicInfo.name,
                  },
              ]
            : [];
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

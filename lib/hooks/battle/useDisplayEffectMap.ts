'use client';

import { useState } from 'react';

import {
    buildDisplayEffects,
    type DisplayEffect,
} from '@/lib/utils/battle/view';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';

/** Раз на зміну черги, не на рядок; незмінні списки ефектів лишаються тими самими масивами. */
export function useDisplayEffectMap(
    order: BattleParticipant[],
    rules?: Ruleset
): Map<string, DisplayEffect[]> {
    const [state, setState] = useState(() => ({
        order,
        effects: buildDisplayEffects(order, undefined, rules),
    }));

    if (state.order !== order) {
        const next = {
            order,
            effects: buildDisplayEffects(order, state.effects, rules),
        };

        setState(next);

        return next.effects;
    }

    return state.effects;
}

import { value } from '../characteristics/derive';
import { applyBurden, asBurdenTier, tierAfterSpend } from '../equipment/burden';
import { PARTICIPANT_SLOT } from '../slots';

import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { consumableSpend } from '@/lib/utils/items/consumables';
import type { TurnHook, TurnStartCtx } from '@/lib/utils/rules/systems/types';

/** Consumables spent in battle lighten the pack (p299): the tier and its Agility penalty are re-derived at the turn start */
export const wfrpBurdenRefresh: TurnHook<TurnStartCtx> = (ctx) => {
    const unchanged = { participants: ctx.participants, messages: [] };

    const p = findParticipant(ctx.participants, ctx.id);

    const slot = p && PARTICIPANT_SLOT.read(p.abilities.system);

    const load = slot?.stats.load;

    if (!p || !slot || !load) return unchanged;

    const tier = tierAfterSpend(load, consumableSpend(p));

    if (tier === asBurdenTier(slot.stats.burden)) return unchanged;

    const base = {
        ...slot.characteristics,
        base: { ...slot.characteristics.base, ag: load.ag.base },
        advances: { ...slot.characteristics.advances, ag: load.ag.advances },
    };

    const characteristics = applyBurden(base, tier);

    const { burden: _old, ...stats } = slot.stats;

    return {
        participants: replaceParticipant(ctx.participants, {
            ...p,
            abilities: {
                ...p.abilities,
                system: PARTICIPANT_SLOT.write(
                    {
                        characteristics,
                        stats: {
                            ...stats,
                            ag: value(characteristics, 'ag'),
                            ...(tier !== 0 && { burden: tier }),
                        },
                    },
                    p.abilities.system
                ),
            },
        }),
        messages: [],
    };
};

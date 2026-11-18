import { readCharacteristics } from './characteristics/keys';
import { LOCATIONS } from './combat/constants';
import { PARTICIPANT_SLOT, PARTICIPANT_STATE } from './slots';

import type { SlotRedactor } from '@/lib/utils/rules/systems/types-participant';

const NO_AP = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<
    (typeof LOCATIONS)[number],
    number
>;

/** An enemy keeps its size and walk speed; characteristics, armour, ward, fortune, sin and held channelling are the GM's secret */
export const redactWfrpSlot: SlotRedactor = (slot, scope) => {
    if (slot.key !== 'wfrp') return slot;

    if (scope === 'abilities') {
        const data = PARTICIPANT_SLOT.read(slot);

        if (!data) return slot;

        const { size, flexible } = data.stats;

        const { move } = readCharacteristics({
            characteristics: data.characteristics,
        });

        return PARTICIPANT_SLOT.write({
            characteristics: { move } as typeof data.characteristics,
            stats: {
                sb: 0,
                tb: 0,
                ag: 0,
                ap: NO_AP,
                ...(size && { size }),
                ...(flexible && { flexible }),
            },
        });
    }

    const state = PARTICIPANT_STATE.read(slot);

    if (!state) return slot;

    const { fortune: _f, sin: _s, channelledSl: _c, ...open } = state;

    return PARTICIPANT_STATE.write(open);
};

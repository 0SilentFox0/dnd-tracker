import type { Characteristics } from '../../characteristics/keys';
import { DEFAULT_CHARACTERISTICS } from '../../characteristics/keys';
import { wfrpAbilitiesOf } from '../../combat/participant';
import { withWfrpState } from '../../state';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleParticipant } from '@/types/battle';

export function caster(
    over: {
        base?: Partial<Characteristics['base']>;
        skillAdvances?: Record<string, number>;
        ap?: { head: number; arm: number; body: number; leg: number };
        channelledSl?: number;
        sin?: number;
    } = {}
): BattleParticipant {
    const characteristics: Characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: {
            ...DEFAULT_CHARACTERISTICS.base,
            int: 40,
            wp: 40,
            ...over.base,
        },
        skillAdvances: over.skillAdvances ?? { 'language:magick': 10 },
    };

    const p = makeParticipant({ id: 'c', hp: 20, maxHp: 20 });

    return withWfrpState(
        {
            ...p,
            abilities: {
                ...p.abilities,
                ...wfrpAbilitiesOf(characteristics, over.ap && { ap: over.ap }),
            },
        },
        { channelledSl: over.channelledSl, sin: over.sin }
    );
}
